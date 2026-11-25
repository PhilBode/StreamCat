import type {RedemptionListener, StreamOnlineListener} from "../models/twitch-events"
import {Injectable, OnModuleDestroy, ServiceUnavailableException} from "@nestjs/common"
import {ApiClient} from "@twurple/api"
import {AppTokenAuthProvider} from "@twurple/auth"
import {EventSubMiddleware} from "@twurple/eventsub-http"
import {EventSubWsListener} from "@twurple/eventsub-ws"
import type {EventSubBase, EventSubSubscription} from "@twurple/eventsub-base"
import {createHash} from "node:crypto"
import type {IRouter} from "express"
import {apiHost, BotLoggerService, errorDetails, type ModuleLogger, requireEnv} from "@streamcat/core"
import {TwitchAuthProvider} from "../auth/twitch-auth-provider"
import {TwitchConfigRepository} from "@streamcat/db"
import {TwitchService} from "../services/twitch.service"
import {TwitchSubscriptionService} from "./twitch-subscription.service"
import {twitchSocketErrorDetails} from "./twitch-socket-error"
import {createTwitchWebhookGuard, type TwitchWebhookObservation} from "./webhook-security"

const EVENTSUB_PATH = "eventsub"
const STREAM_ONLINE_EVENT = "stream.online"
const STREAM_ONLINE_SUBSCRIPTION_PREFIX = `${STREAM_ONLINE_EVENT}.`
const STALE_NOTIFICATION_MS = 10 * 60_000
const RECOVERY_COOLDOWN_MS = 5 * 60_000
const TWURPLE_LOG_LEVEL = {critical: 0, error: 1, warning: 2, info: 3} as const

function twurpleLoggerOptions(logger: ModuleLogger): {custom: (level: number, message: string) => void} {
    return {
        custom: (level, message) => {
            const line = `twurple ${message}`
            if (level <= TWURPLE_LOG_LEVEL.error) logger.error(line)
            else if (level === TWURPLE_LOG_LEVEL.warning) logger.warn(line)
            else if (level === TWURPLE_LOG_LEVEL.info) logger.info(line)
            else logger.debug(line)
        }
    }
}

@Injectable()
export class TwitchEventSubManager implements OnModuleDestroy {
    private readonly logger: ModuleLogger
    private wsListener?: EventSubWsListener
    private httpListener?: EventSubMiddleware
    private webhookReady?: Promise<void>
    private resolveWebhookReady?: () => void
    private httpReady = false
    private appClient?: ApiClient
    private readonly subscriptions = new TwitchSubscriptionService()
    private started = false
    private starting?: Promise<void>
    private retryTimer?: ReturnType<typeof setTimeout>
    private retrying?: Promise<void>
    private retryDelay = 30_000
    private shuttingDown = false
    private subscriptionsLoaded = false
    private readonly failedSubscriptions = new Set<string>()
    private readonly connectedWsUsers = new Set<string>()
    private webhookHost = ""
    private webhookSecretFingerprint?: string
    private readonly streamerNames = new Map<string, string>()
    private readonly recoveryAttempts = new Map<string, number>()
    private streamListener?: StreamOnlineListener
    private redemptionListener?: RedemptionListener
    private readonly redemptionSubscriptions = new Map<
        string,
        {userId: string; subscription?: EventSubSubscription; failed: boolean; confirmed: boolean}
    >()

    constructor(
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly twitchAuth: TwitchAuthProvider,
        private readonly twitchService: TwitchService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    onStreamOnline(listener: StreamOnlineListener): () => void {
        this.streamListener = listener
        return () => {
            if (this.streamListener === listener) this.streamListener = undefined
        }
    }

    onRedemption(listener: RedemptionListener): () => void {
        this.redemptionListener = listener
        return () => {
            if (this.redemptionListener === listener) this.redemptionListener = undefined
        }
    }

    get isWebhookActive(): boolean {
        return !!this.httpListener && this.httpReady
    }

    get isWebSocketActive(): boolean {
        return this.wsListener?.isActive ?? false
    }

    get isWebSocketConnected(): boolean {
        return this.connectedWsUsers.size > 0
    }

    get activeStreamSubscriptionCount(): number {
        return this.subscriptions.activeCount
    }

    get pendingStreamSubscriptionCount(): number {
        return this.subscriptions.pendingCount
    }

    get failedStreamSubscriptionCount(): number {
        return this.failedSubscriptions.size
    }

    get isReady(): boolean {
        return (
            this.started &&
            this.subscriptionsLoaded &&
            this.isWebhookActive &&
            this.isWebSocketActive &&
            this.failedSubscriptions.size === 0 &&
            this.pendingStreamSubscriptionCount === 0 &&
            [...this.redemptionSubscriptions.values()].every(
                (entry) => !entry.failed && entry.confirmed && this.connectedWsUsers.has(entry.userId)
            )
        )
    }

    get startupState(): "ready" | "degraded" | "stopped" {
        if (this.isReady) return "ready"
        return this.isWebhookActive || this.isWebSocketActive ? "degraded" : "stopped"
    }

    get webhookUrl(): string | null {
        return this.isWebhookActive ? `https://${this.webhookHost}/${EVENTSUB_PATH}` : null
    }

    async start(): Promise<void> {
        if (this.shuttingDown) return
        if (this.starting) return this.starting
        if (this.retrying) return this.retrying
        if (this.started) return
        this.starting = (async () => {
            await this.startWebhook()
            if (this.shuttingDown) return
            await this.startWsListener()
            if (this.shuttingDown) return
            this.restoreRedemptionSubscriptions()
            await this.subscribeAllStreamers()
            this.started = this.subscriptionsLoaded && this.isWebhookActive && this.isWebSocketActive
        })()
        try {
            await this.starting
        } catch (error) {
            this.scheduleRetry()
            throw error
        } finally {
            this.starting = undefined
        }
    }

    async subscribeToStreamer(streamerName: string): Promise<void> {
        let userId: string
        try {
            userId = await this.twitchService.resolveUserId(streamerName)
        } catch (err) {
            this.logger.error(`Failed to resolve user ID for ${streamerName}: ${errorDetails(err)}`)
            return
        }

        await this.twitchConfigRepo.updateChannelIdByUsername(streamerName.toLowerCase(), userId)
        const follows = await this.twitchConfigRepo.findByChannelId(userId)
        if (follows.length === 0) return

        if (this.subscriptions.has(userId)) {
            this.subscriptions.setRefCount(userId, follows.length)
            return
        }

        await this.subscribeViaWebhook(userId, streamerName, follows.length)
    }

    async unsubscribeFromStreamer(twitchUserId: string): Promise<void> {
        this.failedSubscriptions.delete(twitchUserId)
        const sub = this.subscriptions.getSubscription(twitchUserId)
        const result = this.subscriptions.unsubscribe(twitchUserId)

        if (result === "kept") {
            this.logger.info(
                `Kept Twitch subscription for user ${twitchUserId} (${this.subscriptions.refCount(twitchUserId)} guild(s) still follow)`
            )
            return
        }

        this.streamerNames.delete(twitchUserId)
        if (sub) {
            try {
                // Managed Twurple subscriptions delete themselves with their own auth context.
                sub.stop()
                this.logger.debug(`Requested Twitch subscription removal for user ${twitchUserId}`)
            } catch (error) {
                this.logger.debug(`Failed to stop subscription for ${twitchUserId}: ${errorDetails(error)}`)
            }
        }
    }

    subscribeToRedemption(userId: string, guildId: string): void {
        if (this.shuttingDown) return
        const previous = this.redemptionSubscriptions.get(guildId)
        if (previous?.userId === userId && !previous.failed) return
        try {
            previous?.subscription?.stop()
        } catch (error) {
            this.logger.warn(`Could not stop previous redemption listener for guild ${guildId}: ${errorDetails(error)}`)
        }
        this.redemptionSubscriptions.set(guildId, {userId, failed: true, confirmed: false})
        if (!this.wsListener) {
            this.scheduleRetry()
            return
        }
        try {
            const listener = this.wsListener
            const subscription = listener.onChannelRedemptionAdd(userId, async (data) => {
                const current = this.redemptionSubscriptions.get(guildId)
                if (this.wsListener !== listener || current?.subscription !== subscription || current.failed) return
                try {
                    await this.redemptionListener?.(
                        {
                            broadcasterUserId: userId,
                            guildId,
                            rewardId: data.rewardId,
                            input: data.input,
                            userName: data.userName,
                            rewardTitle: data.rewardTitle,
                            redeemerUserId: data.userId
                        },
                        data.status === "UNFULFILLED"
                            ? async () => {
                                  await data.updateStatus("CANCELED")
                              }
                            : undefined
                    )
                } catch (error) {
                    this.logger.error(`Redemption handler error for guild ${guildId}: ${errorDetails(error)}`)
                }
            })
            this.redemptionSubscriptions.set(guildId, {userId, subscription, failed: false, confirmed: false})
            this.logger.info(`Registered redemption listener for user ${userId}`)
        } catch (err) {
            this.logger.warn(`Could not subscribe to redemptions: ${errorDetails(err)}`)
            this.scheduleRetry()
        }
    }

    unsubscribeFromRedemptions(guildId: string): void {
        const entry = this.redemptionSubscriptions.get(guildId)
        if (!entry) return
        this.redemptionSubscriptions.delete(guildId)
        try {
            entry.subscription?.stop()
        } catch (error) {
            this.logger.warn(`Could not stop redemption listener guild=${guildId} ${errorDetails(error)}`)
        }
    }

    /** Register before Nest installs its JSON parser: signature validation needs raw bytes. */
    attachWebhook(router: IRouter): void {
        if (this.httpListener) return
        const secret = requireEnv("EVENTSUB_SECRET")
        this.webhookHost = apiHost()
        this.webhookSecretFingerprint = createHash("sha256").update(secret).digest("hex").slice(0, 8)
        this.appClient = new ApiClient({
            authProvider: new AppTokenAuthProvider(requireEnv("TWITCH_APP_CLIENT_ID"), requireEnv("TWITCH_APP_SECRET"))
        })
        const listener = new EventSubMiddleware({
            apiClient: this.appClient,
            hostName: this.webhookHost,
            pathPrefix: EVENTSUB_PATH,
            secret,
            logger: twurpleLoggerOptions(this.logger),
            // Next changes Host to the internal service name. Twurple still verifies every HMAC.
            strictHostCheck: false
        })
        router.use(
            `/${EVENTSUB_PATH}`,
            createTwitchWebhookGuard({
                secret,
                onObserved: (observation) => this.handleWebhookObservation(observation)
            })
        )
        listener.apply(router)
        this.httpListener = listener
        this.watchSubscriptionResults(listener)
        this.webhookReady = new Promise((resolve) => {
            this.resolveWebhookReady = resolve
        })
        this.logger.debug(
            `EventSub webhook configured host=${this.webhookHost} path=/${EVENTSUB_PATH} secret_fingerprint=${this.secretFingerprintLabel()}`
        )
    }

    private secretFingerprintLabel(): string {
        return this.webhookSecretFingerprint ?? "unknown"
    }

    private handleWebhookObservation(observation: TwitchWebhookObservation): void {
        const subscriptionId = observation.subscriptionId
        const userId = subscriptionId ? this.subscriptions.findBySubscriptionId(subscriptionId) : undefined
        const channel = userId ? (this.streamerNames.get(userId) ?? userId) : "unknown"

        if (!observation.signatureValid) {
            this.handleSignatureMismatch(observation, userId)
            return
        }

        if (observation.messageType === "notification") {
            this.handleNotification(observation, userId, channel)
            return
        }

        this.logger.debug(
            `EventSub webhook type=${observation.messageType ?? "unknown"} subscription=${subscriptionId ?? "unknown"} channel=${channel} signature=valid age_ms=${observation.ageMs ?? "unknown"}`
        )
    }

    private handleSignatureMismatch(observation: TwitchWebhookObservation, userId: string | undefined): void {
        this.logger.warn(
            `EventSub webhook signature rejected subscription=${observation.subscriptionId ?? "unknown"} type=${observation.messageType ?? "unknown"} channel=${userId ? (this.streamerNames.get(userId) ?? userId) : "unknown"} bytes=${observation.bytes} age_ms=${observation.ageMs ?? "unknown"} secret_fingerprint=${this.secretFingerprintLabel()}`
        )
        if (userId && observation.subscriptionId) {
            this.recoverUnverifiableSubscription(userId, observation.subscriptionId)
        }
    }

    private handleNotification(
        observation: TwitchWebhookObservation,
        userId: string | undefined,
        channel: string
    ): void {
        const stale = (observation.ageMs ?? 0) > STALE_NOTIFICATION_MS
        this.logger.info(
            `EventSub notification subscription=${observation.subscriptionId ?? "unknown"} event=${STREAM_ONLINE_EVENT} channel=${channel} user=${userId ?? "unknown"} age_ms=${observation.ageMs ?? "unknown"} stale=${stale}`
        )
        if (userId || !observation.subscriptionId) return
        this.logger.warn(
            `EventSub notification for untracked subscription=${observation.subscriptionId}; Twitch retries will keep failing until it is removed`
        )
        void this.recoverUntrackedSubscription(observation.subscriptionId).catch((error) =>
            this.logger.warn(
                `Untracked EventSub recovery failed subscription=${observation.subscriptionId}: ${errorDetails(error)}`
            )
        )
    }

    private beginRecovery(subscriptionId: string): boolean {
        const now = Date.now()
        if (now - (this.recoveryAttempts.get(subscriptionId) ?? 0) < RECOVERY_COOLDOWN_MS) return false
        this.recoveryAttempts.set(subscriptionId, now)
        return true
    }

    private recoverUnverifiableSubscription(userId: string, subscriptionId: string): void {
        if (this.shuttingDown || !this.subscriptionsLoaded || !this.beginRecovery(subscriptionId)) return

        const subscription = this.subscriptions.getSubscription(userId)
        const channel = this.streamerNames.get(userId) ?? userId
        this.logger.warn(
            `Recreating EventSub subscription for ${channel} (${userId}) after signature mismatch; possible EVENTSUB_SECRET mismatch`
        )
        this.subscriptions.remove(userId)
        this.failedSubscriptions.add(userId)
        try {
            subscription?.stop()
        } catch (error) {
            this.logger.debug(`Could not remove mismatched subscription ${subscriptionId}: ${errorDetails(error)}`)
        }
        this.scheduleRetry()
    }

    private async recoverUntrackedSubscription(subscriptionId: string): Promise<void> {
        const client = this.appClient
        if (!client || this.shuttingDown || !this.subscriptionsLoaded || !this.beginRecovery(subscriptionId)) return

        const channelId = subscriptionId.startsWith(STREAM_ONLINE_SUBSCRIPTION_PREFIX)
            ? subscriptionId.slice(STREAM_ONLINE_SUBSCRIPTION_PREFIX.length)
            : ""
        const followed = channelId ? (await this.twitchConfigRepo.findByChannelId(channelId)).length > 0 : false
        await client.eventSub.deleteSubscription(subscriptionId)
        this.logger.info(`Removed untracked EventSub subscription=${subscriptionId} channel=${channelId || "unknown"}`)
        if (!followed) return

        // Twurple caches subscriptions adopted at startup. Reload that cache, or the retry
        // would resume the remote subscription we just deleted instead of creating a new one.
        await this.httpListener?.markAsReady()
        this.failedSubscriptions.add(channelId)
        this.logger.warn(`Tracked channel ${channelId} had no local EventSub handler; recreating its subscription`)
        this.scheduleRetry()
    }

    /** Called after the shared HTTP server is listening, so Twitch can verify callbacks. */
    async markWebhookReady(): Promise<void> {
        const listener = this.httpListener
        if (!listener) return
        try {
            await this.removeOrphanedSubscriptions()
            await listener.markAsReady()
            if (this.shuttingDown || this.httpListener !== listener) return
            this.httpReady = true
            this.logger.info(
                `EventSub webhook ready at https://${this.webhookHost}/${EVENTSUB_PATH} (shared API server)`
            )
        } catch (error) {
            this.httpReady = false
            this.logger.error(`EventSub webhook startup failed ${errorDetails(error)}`)
            this.scheduleRetry()
        } finally {
            this.resolveWebhookReady?.()
        }
    }

    private async removeOrphanedSubscriptions(): Promise<void> {
        const client = this.appClient
        if (!client || this.shuttingDown) return
        const callbackPrefix = `https://${this.webhookHost}/${EVENTSUB_PATH}/event/`
        try {
            const [remote, follows] = await Promise.all([
                client.eventSub.getSubscriptionsPaginated().getAll(),
                this.twitchConfigRepo.findAll()
            ])
            const followed = new Set(follows.map((follow) => follow.channelId))
            let scanned = 0
            let kept = 0
            let removed = 0
            for (const subscription of remote) {
                if (subscription.type !== STREAM_ONLINE_EVENT || subscription._transport.method !== "webhook") continue
                if (!subscription._transport.callback.startsWith(callbackPrefix)) continue
                scanned++
                const broadcaster = subscription.condition.broadcaster_user_id
                const channelId = typeof broadcaster === "string" ? broadcaster : ""
                if (channelId && followed.has(channelId)) {
                    kept++
                    continue
                }
                try {
                    await client.eventSub.deleteSubscription(subscription.id)
                    removed++
                    this.logger.info(
                        `Removed orphaned EventSub subscription=${subscription.id} channel=${channelId || "unknown"} status=${subscription.status}`
                    )
                } catch (error) {
                    this.logger.warn(
                        `Could not remove orphaned EventSub subscription=${subscription.id} channel=${channelId || "unknown"}: ${errorDetails(error)}`
                    )
                }
            }
            this.logger.info(
                `EventSub remote subscriptions scanned=${scanned} kept=${kept} removed=${removed} followed_channels=${followed.size}`
            )
        } catch (error) {
            this.logger.warn(`Could not reconcile EventSub subscriptions: ${errorDetails(error)}`)
        }
    }

    private async startWebhook(): Promise<void> {
        await this.webhookReady
        if (!this.isWebhookActive) {
            throw new ServiceUnavailableException(
                "Live notifications require an available HTTPS EventSub webhook. Check Cloudflared and PUBLIC_URL."
            )
        }
    }

    private async startWsListener(): Promise<void> {
        if (this.wsListener) return
        try {
            const {client} = await this.twitchAuth.ensureInitialized()
            this.wsListener = new EventSubWsListener({
                apiClient: client,
                logger: twurpleLoggerOptions(this.logger)
            })
            const listener = this.wsListener
            const disconnectedAt = new Map<string, number>()
            this.watchSubscriptionResults(listener)
            listener.onUserSocketConnect((userId) => {
                if (this.shuttingDown || this.wsListener !== listener) return
                this.logger.debug(`EventSub WS socket connected user=${userId} awaiting_welcome=true`)
            })
            listener.onUserSocketReady((userId) => {
                if (this.shuttingDown || this.wsListener !== listener) return
                const lastDisconnect = disconnectedAt.get(userId)
                const recoveryMs = lastDisconnect === undefined ? 0 : Date.now() - lastDisconnect
                disconnectedAt.delete(userId)
                this.connectedWsUsers.add(userId)
                this.logger.info(`EventSub WS session ready user=${userId} recovered_after_ms=${recoveryMs}`)
            })
            listener.onUserSocketDisconnect((userId, error) => {
                if (this.shuttingDown || this.wsListener !== listener) return
                if (!disconnectedAt.has(userId)) disconnectedAt.set(userId, Date.now())
                this.connectedWsUsers.delete(userId)
                for (const entry of this.redemptionSubscriptions.values()) {
                    if (entry.userId === userId) entry.confirmed = false
                }
                this.logger.warn(
                    `EventSub WS disconnected user=${userId} reconnect=automatic ${twitchSocketErrorDetails(error)}`
                )
            })
            this.wsListener.start()
            this.logger.info("EventSub WS listener started; connections open when subscriptions are registered")
        } catch (err) {
            const failedListener = this.wsListener
            this.wsListener = undefined
            this.connectedWsUsers.clear()
            try {
                failedListener?.stop()
            } catch (stopError) {
                this.logger.warn(`Could not stop failed EventSub WS listener ${errorDetails(stopError)}`)
            }
            this.logger.warn(`Failed to start EventSub WS listener: ${errorDetails(err)}`)
            this.scheduleRetry()
        }
    }

    private async subscribeViaWebhook(userId: string, displayName: string, refCount = 1): Promise<void> {
        if (!this.httpListener || !this.httpReady) {
            this.failedSubscriptions.add(userId)
            this.scheduleRetry()
            return
        }
        try {
            const listener = this.httpListener
            const sub = listener.onStreamOnline(userId, async () => {
                if (this.httpListener !== listener) return
                try {
                    await this.notifyStreamOnline(this.appClient!, userId, displayName)
                } catch (err) {
                    this.logger.error(`Webhook stream online handler error for ${displayName}: ${errorDetails(err)}`)
                }
            })
            this.subscriptions.register(userId, sub, refCount)
            this.streamerNames.set(userId, displayName)
            this.failedSubscriptions.delete(userId)
            this.logger.info(`Registered webhook stream listener for ${displayName} (${userId})`)
        } catch (err) {
            this.failedSubscriptions.add(userId)
            this.logger.warn(`Could not subscribe webhook for ${displayName}: ${errorDetails(err)}`)
            this.scheduleRetry()
        }
    }

    private async notifyStreamOnline(client: ApiClient, userId: string, displayName: string): Promise<void> {
        const user = await client.users.getUserById(userId)
        const channel = await client.channels.getChannelInfoById(userId)
        await this.streamListener?.({
            displayName,
            name: displayName,
            userId,
            gameName: channel?.gameName,
            profilePictureUrl: user?.profilePictureUrl
        })
    }

    private async subscribeAllStreamers(): Promise<void> {
        try {
            const streamers = await this.twitchConfigRepo.findAll()
            if (this.shuttingDown) return
            const channels = new Map<string, {username: string; refCount: number}>()
            for (const entry of streamers) {
                const existing = channels.get(entry.channelId)
                channels.set(entry.channelId, {username: entry.username, refCount: (existing?.refCount ?? 0) + 1})
            }
            for (const [userId, entry] of channels) {
                if (this.subscriptions.has(userId)) {
                    this.subscriptions.setRefCount(userId, entry.refCount)
                    continue
                }
                await this.subscribeViaWebhook(userId, entry.username, entry.refCount)
            }
            this.subscriptionsLoaded = true
            this.logger.info(
                `Twitch stream subscriptions: ${this.activeStreamSubscriptionCount} active, ${this.pendingStreamSubscriptionCount} pending, ${this.failedSubscriptions.size} failed for ${streamers.length} guild follows`
            )
        } catch (err) {
            this.subscriptionsLoaded = false
            this.logger.warn(`Failed to subscribe tracked streamers: ${errorDetails(err)}`)
            this.scheduleRetry()
        }
    }

    private watchSubscriptionResults(listener: EventSubBase): void {
        const isCurrent = () => listener === this.httpListener || listener === this.wsListener
        listener.onSubscriptionCreateSuccess((sub) => {
            if (!isCurrent()) return
            this.retryDelay = 30_000
            this.failedSubscriptions.delete(sub.id)
            const userId = this.subscriptions.findBySubscriptionId(sub.id)
            if (userId && this.subscriptions.getSubscription(userId) === sub) {
                this.subscriptions.confirm(userId)
                this.failedSubscriptions.delete(userId)
                this.logger.info(
                    `Stream subscription confirmed for user ${userId} (${this.activeStreamSubscriptionCount} active)`
                )
            }
            for (const [guildId, entry] of this.redemptionSubscriptions) {
                if (entry.subscription !== sub) continue
                entry.confirmed = true
                this.logger.info(`Redemption subscription confirmed guild=${guildId} user=${entry.userId}`)
            }
        })
        listener.onSubscriptionCreateFailure((sub, error) => {
            if (!isCurrent()) return
            if (this.markSubscriptionFailed(sub)) {
                try {
                    sub.stop()
                } catch (stopError) {
                    this.logger.debug(
                        `Failed to remove unsuccessful subscription ${sub.id}: ${errorDetails(stopError)}`
                    )
                }
                this.scheduleRetry()
            }
            this.logger.warn(`EventSub subscription ${sub.id} failed: ${errorDetails(error)}`)
        })
        listener.onRevoke((sub, status) => {
            if (!isCurrent()) return
            if (this.markSubscriptionFailed(sub)) {
                this.logger.warn(`EventSub subscription ${sub.id} revoked: ${status}`)
                this.scheduleRetry()
            }
        })
    }

    private markSubscriptionFailed(sub: EventSubSubscription): boolean {
        let tracked = false
        const userId = this.subscriptions.findBySubscriptionId(sub.id)
        if (userId && this.subscriptions.getSubscription(userId) === sub) {
            tracked = true
            this.subscriptions.remove(userId)
            this.failedSubscriptions.add(userId)
        }
        for (const redemption of this.redemptionSubscriptions.values()) {
            if (redemption.subscription !== sub) continue
            tracked = true
            redemption.failed = true
            redemption.confirmed = false
        }
        return tracked
    }

    private scheduleRetry(): void {
        if (this.shuttingDown || this.retryTimer) return
        const delay = this.retryDelay
        this.retryDelay = Math.min(delay * 2, 300_000)
        this.logger.info(`Retrying failed Twitch subscriptions in ${delay / 1000}s`)
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined
            void this.retryFailedSubscriptions()
        }, delay)
        this.retryTimer.unref()
    }

    private async retryFailedSubscriptions(): Promise<void> {
        if (this.shuttingDown || this.retrying) return
        if (this.starting) {
            this.scheduleRetry()
            return
        }
        this.retrying = this.restoreSubscriptions()
        try {
            await this.retrying
        } catch (error) {
            this.logger.warn(`Twitch subscription recovery failed ${errorDetails(error)}`)
            this.scheduleRetry()
        } finally {
            this.retrying = undefined
        }
    }

    private async restoreSubscriptions(): Promise<void> {
        if (!this.httpReady) await this.markWebhookReady()
        if (this.shuttingDown || !this.httpReady) return
        await this.startWsListener()
        if (this.shuttingDown) return
        await this.subscribeAllStreamers()
        if (this.shuttingDown) return
        this.restoreRedemptionSubscriptions()
        this.started = this.subscriptionsLoaded && this.isWebhookActive && this.isWebSocketActive
    }

    private restoreRedemptionSubscriptions(): void {
        for (const [guildId, entry] of this.redemptionSubscriptions) {
            if (entry.failed) this.subscribeToRedemption(entry.userId, guildId)
        }
    }

    async onModuleDestroy(): Promise<void> {
        this.shuttingDown = true
        this.streamListener = undefined
        this.redemptionListener = undefined
        clearTimeout(this.retryTimer)
        this.retryTimer = undefined
        this.resolveWebhookReady?.()
        try {
            await this.starting?.catch((error) =>
                this.logger.warn(`EventSub startup failed during shutdown: ${errorDetails(error)}`)
            )
            await this.retrying
            this.wsListener?.stop()
            // The shared server closes with Nest. Leave remote webhook subscriptions intact.
            this.httpListener = undefined
            this.httpReady = false
        } finally {
            this.wsListener = undefined
            this.appClient = undefined
            this.webhookHost = ""
            this.webhookReady = undefined
            this.resolveWebhookReady = undefined
            this.connectedWsUsers.clear()
            this.redemptionSubscriptions.clear()
            this.subscriptions.clear()
            this.failedSubscriptions.clear()
            this.streamerNames.clear()
            this.recoveryAttempts.clear()
            this.subscriptionsLoaded = false
            this.started = false
            this.retryDelay = 30_000
            this.shuttingDown = false
        }
    }
}
