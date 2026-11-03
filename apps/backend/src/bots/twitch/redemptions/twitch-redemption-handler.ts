import {Inject, Injectable} from "@nestjs/common"
import {SongRequestRepository, TwitchAuthRepository, TwitchRewardRepository} from "@streamcat/db"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import type {TwitchRewardKind} from "@streamcat/interfaces"
import {TwitchChatClient} from "../../../integrations/twitch/chat/twitch-chat-client"
import type {TwitchRedemption} from "../../../integrations/twitch/models/twitch-redemption"
import {REDEMPTION_HANDLERS, type RedemptionHandler, type RedemptionOutcome} from "./redemption-handler.interface"

@Injectable()
export class TwitchRedemptionHandler {
    private readonly logger: ModuleLogger
    private readonly byKind = new Map<TwitchRewardKind, RedemptionHandler>()

    constructor(
        private readonly rewardRepo: TwitchRewardRepository,
        private readonly authRepo: TwitchAuthRepository,
        private readonly chatClient: TwitchChatClient,
        private readonly requests: SongRequestRepository,
        @Inject(REDEMPTION_HANDLERS) handlers: RedemptionHandler[],
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
        for (const handler of handlers) {
            this.byKind.set(handler.kind, handler)
        }
    }

    async handleRedemption(context: TwitchRedemption, refund?: () => Promise<void>): Promise<void> {
        const {broadcasterUserId, guildId, rewardId, rewardTitle} = context
        try {
            const auth = await this.authRepo.findByGuildId(guildId)
            if (!auth || auth.userId !== broadcasterUserId) {
                this.logger.info(`Ignoring redemption from previous Twitch account guild=${guildId}`)
                return
            }
            const assignment = await this.requests.findByChannelId(broadcasterUserId)
            if (assignment?.guildId !== guildId) return
            const mapping = await this.rewardRepo.findByRewardId(guildId, rewardId)
            if (!mapping) {
                this.logger.info(`Ignoring unmapped reward ${rewardId} ("${rewardTitle}") for guild ${guildId}`)
                return
            }
            // The event always carries the current Twitch-side title — no stored copy needed.
            this.logger.info(`Redemption received guild=${guildId} channel=${broadcasterUserId} reward=${rewardId}`)

            const handler = this.byKind.get(mapping.kind)
            if (!handler) {
                this.logger.warn(`No handler registered for reward kind ${mapping.kind} (reward ${rewardId})`)
                return
            }

            let outcome: RedemptionOutcome
            try {
                outcome = await handler.handle(context)
            } catch (err) {
                this.logger.error(
                    `Redemption handler failed kind=${mapping.kind} guild=${guildId} ${errorDetails(err)}`
                )
                await this.refundRedemption(guildId, rewardId, refund)
                return
            }

            if (outcome.refund) await this.refundRedemption(guildId, rewardId, refund)
            if (outcome?.chatReply) {
                await this.sendChatMessage(broadcasterUserId, outcome.chatReply)
            }
        } catch (err) {
            this.logger.error(`Redemption failed guild=${guildId} ${errorDetails(err)}`)
        }
    }

    private async sendChatMessage(broadcasterId: string, message: string): Promise<void> {
        try {
            await this.chatClient.sendAsBot(broadcasterId, message)
        } catch (err) {
            this.logger.warn(`Could not send chat message channel=${broadcasterId} ${errorDetails(err)}`)
        }
    }

    private async refundRedemption(guildId: string, rewardId: string, refund?: () => Promise<void>): Promise<void> {
        if (!refund) {
            this.logger.warn(
                `Redemption cannot be refunded guild=${guildId} reward=${rewardId} reason=already_processed`
            )
            return
        }
        try {
            await refund()
            this.logger.info(`Redemption refunded guild=${guildId} reward=${rewardId}`)
        } catch (error) {
            this.logger.warn(`Redemption refund failed guild=${guildId} reward=${rewardId} ${errorDetails(error)}`)
        }
    }
}
