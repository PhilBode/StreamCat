import type {ChatMessageListener} from "../models/twitch-events"
import {Injectable, OnModuleDestroy} from "@nestjs/common"
import {EventSubWsListener} from "@twurple/eventsub-ws"
import type {EventSubChannelChatMessageEvent, EventSubSubscription} from "@twurple/eventsub-base"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import {SongRequestRepository} from "@streamcat/db"
import {TwitchBotAccountService, type TwitchBotAccountRuntime} from "../auth/twitch-bot-account.service"
import {twitchSocketErrorDetails} from "../eventsub/twitch-socket-error"

@Injectable()
export class TwitchChatClient implements OnModuleDestroy {
    private readonly logger: ModuleLogger
    private listener?: EventSubWsListener
    private runtime?: TwitchBotAccountRuntime
    private readonly subscriptions = new Map<string, EventSubSubscription>()
    private reconciliation: Promise<void> = Promise.resolve()
    private retryTimer?: ReturnType<typeof setTimeout>
    private retryDelay = 30_000
    private shuttingDown = false
    private messageListener?: ChatMessageListener

    constructor(
        private readonly botAccount: TwitchBotAccountService,
        private readonly assignments: SongRequestRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("TwitchChat")
    }

    onMessage(listener: ChatMessageListener): () => void {
        this.messageListener = listener
        return () => {
            if (this.messageListener === listener) this.messageListener = undefined
        }
    }

    async start(): Promise<void> {
        await this.reconcile()
    }

    reconcile(): Promise<void> {
        const result = this.reconciliation
            .then(async () => {
                if (this.shuttingDown) return
                await this.botAccount.start()
                if (this.shuttingDown) return
                await this.reconcileChannels()
            })
            .catch((error) => {
                this.logger.error(`Twitch bot chat reconciliation failed ${errorDetails(error)}`)
                this.scheduleRetry()
            })
        this.reconciliation = result
        return result
    }

    private async reconcileChannels(): Promise<void> {
        const runtime = this.botAccount.getRuntime()
        if (!runtime) {
            this.stopListener()
            if (this.botAccount.status.configured) this.scheduleRetry()
            return
        }

        const assignments = await this.assignments.findAssignedGuilds()
        if (this.shuttingDown || this.botAccount.getRuntime()?.client !== runtime.client) return
        if (this.runtime?.client !== runtime.client) {
            this.stopListener()
            this.runtime = runtime
            try {
                this.listener = this.createListener(runtime)
                this.listener.start()
            } catch (error) {
                this.stopListener()
                throw error
            }
        }

        // Keep assigned channels connected; handlers decide whether a feature is enabled.
        const channels = new Set(assignments.map((assignment) => assignment.channelId))
        for (const [channelId, subscription] of this.subscriptions) {
            if (channels.has(channelId)) continue
            this.subscriptions.delete(channelId)
            try {
                subscription.stop()
            } catch (error) {
                this.logger.warn(`Could not remove Twitch chat listener channel=${channelId} ${errorDetails(error)}`)
            }
        }
        for (const channelId of channels) {
            if (!this.subscriptions.has(channelId)) this.subscribeToChannel(channelId, runtime)
        }
        this.logger.info(`Twitch bot chat listeners registered channels=${this.subscriptions.size}`)
    }

    private createListener(runtime: TwitchBotAccountRuntime): EventSubWsListener {
        const listener = new EventSubWsListener({apiClient: runtime.client})
        let disconnectedAt: number | undefined
        listener.onUserSocketConnect(() => {
            if (this.shuttingDown || this.listener !== listener) return
            this.logger.debug(`Twitch bot chat socket connected user=${runtime.userId} awaiting_welcome=true`)
        })
        listener.onUserSocketReady(() => {
            if (this.shuttingDown || this.listener !== listener) return
            const recoveryMs = disconnectedAt === undefined ? 0 : Date.now() - disconnectedAt
            disconnectedAt = undefined
            this.logger.info(
                `Twitch bot chat session ready user=${runtime.userId} channels=${this.subscriptions.size} recovered_after_ms=${recoveryMs}`
            )
        })
        listener.onUserSocketDisconnect((_userId, error) => {
            if (this.shuttingDown || this.listener !== listener) return
            disconnectedAt ??= Date.now()
            this.logger.warn(
                `Twitch bot chat disconnected user=${runtime.userId} channels=${this.subscriptions.size} reconnect=automatic ${twitchSocketErrorDetails(error)}`
            )
        })
        listener.onSubscriptionCreateSuccess((subscription) => {
            if (this.listener !== listener) return
            const channelId = this.findChannel(subscription)
            if (channelId) {
                this.retryDelay = 30_000
                this.logger.info(`Twitch bot chat subscription confirmed channel=${channelId}`)
            }
        })
        listener.onSubscriptionCreateFailure((subscription, error) => {
            if (this.listener !== listener) return
            const channelId = this.findChannel(subscription)
            if (!channelId) return
            this.subscriptions.delete(channelId)
            this.logger.warn(`Twitch bot chat subscription failed channel=${channelId} ${errorDetails(error)}`)
            try {
                subscription.stop()
            } catch (stopError) {
                this.logger.warn(`Could not remove failed Twitch chat subscription ${errorDetails(stopError)}`)
            }
            this.scheduleRetry()
        })
        listener.onSubscriptionDeleteFailure((_subscription, error) => {
            if (this.listener !== listener) return
            this.logger.warn(`Twitch bot chat subscription removal failed ${errorDetails(error)}`)
            this.scheduleRetry()
        })
        listener.onRevoke((subscription, status) => {
            if (this.listener !== listener) return
            const channelId = this.findChannel(subscription)
            if (!channelId) return
            this.subscriptions.delete(channelId)
            this.logger.warn(`Twitch bot chat subscription revoked channel=${channelId} status=${status}`)
            this.scheduleRetry()
        })
        return listener
    }

    private subscribeToChannel(channelId: string, runtime: TwitchBotAccountRuntime): void {
        const listener = this.listener
        if (!listener) return
        try {
            const subscription = listener.onChannelChatMessage(channelId, runtime.userId, async (message) => {
                await this.handleMessage(channelId, subscription, listener, runtime, message)
            })
            this.subscriptions.set(channelId, subscription)
        } catch (error) {
            this.logger.warn(`Could not register Twitch bot chat channel=${channelId} ${errorDetails(error)}`)
            this.scheduleRetry()
        }
    }

    private scheduleRetry(): void {
        if (this.shuttingDown || this.retryTimer) return
        const delay = this.retryDelay
        this.retryDelay = Math.min(delay * 2, 300_000)
        this.logger.info(`Retrying Twitch chat in ${delay / 1000}s`)
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined
            void this.reconcile()
        }, delay)
        this.retryTimer.unref()
    }

    private async handleMessage(
        channelId: string,
        subscription: EventSubSubscription,
        listener: EventSubWsListener,
        runtime: TwitchBotAccountRuntime,
        message: EventSubChannelChatMessageEvent
    ): Promise<void> {
        if (!this.isCurrent(channelId, subscription, listener, runtime)) return
        if (message.broadcasterId !== channelId) return
        const handler = this.messageListener
        if (!handler) return
        try {
            const reply = await handler({
                channelId,
                sourceChannelId: message.sourceBroadcasterId ?? undefined,
                userId: message.chatterId,
                text: message.messageText
            })
            if (!this.isCurrent(channelId, subscription, listener, runtime) || this.messageListener !== handler) return
            if (reply) await this.sendAsBot(channelId, reply)
        } catch (error) {
            this.logger.error(`Twitch chat message handling failed channel=${channelId} ${errorDetails(error)}`)
        }
    }

    private isCurrent(
        channelId: string,
        subscription: EventSubSubscription,
        listener: EventSubWsListener,
        runtime: TwitchBotAccountRuntime
    ): boolean {
        return (
            !this.shuttingDown &&
            this.listener === listener &&
            this.subscriptions.get(channelId) === subscription &&
            this.botAccount.getRuntime()?.client === runtime.client
        )
    }

    private findChannel(subscription: EventSubSubscription): string | undefined {
        for (const [channelId, current] of this.subscriptions) {
            if (current === subscription) return channelId
        }
        return undefined
    }

    async sendAsBot(broadcasterId: string, message: string): Promise<void> {
        try {
            await this.sendMessage(broadcasterId, message)
        } catch (error) {
            this.scheduleRetry()
            throw error
        }
    }

    private async sendMessage(broadcasterId: string, message: string): Promise<void> {
        await this.botAccount.start()
        if (this.shuttingDown) {
            throw Object.assign(new Error("Twitch chat is shutting down"), {code: "ETWITCH_CHAT_SHUTTING_DOWN"})
        }
        const runtime = this.botAccount.getRuntime()
        if (!runtime) {
            const code = this.botAccount.status.configured ? "ETWITCH_BOT_NOT_READY" : "ETWITCH_BOT_NOT_CONFIGURED"
            throw Object.assign(new Error("Twitch bot account is not ready"), {code})
        }
        const sent = await runtime.client.asUser(runtime.userId, (context) =>
            context.chat.sendChatMessage(broadcasterId, message.slice(0, 500))
        )
        if (!sent.isSent) throw new Error("Twitch did not send the bot chat message")
    }

    private stopListener(): void {
        const listener = this.listener
        this.listener = undefined
        this.runtime = undefined
        this.subscriptions.clear()
        try {
            listener?.stop()
        } catch (error) {
            this.logger.warn(`Could not stop Twitch bot chat ${errorDetails(error)}`)
        }
    }

    async onModuleDestroy(): Promise<void> {
        this.shuttingDown = true
        this.messageListener = undefined
        clearTimeout(this.retryTimer)
        this.retryTimer = undefined
        this.stopListener()
        await this.reconciliation
    }
}
