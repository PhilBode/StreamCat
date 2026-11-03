import {TwitchAuthProvider} from "../../../integrations/twitch/auth/twitch-auth-provider"
import {TwitchEventSubManager} from "../../../integrations/twitch/eventsub/twitch-event-sub-manager"
import {Injectable} from "@nestjs/common"
import type {TwitchToken} from "@streamcat/interfaces"
import type {AuthFlowOptions} from "../services/oauth-flow.service"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import {SongRequestRepository, TwitchAuthRepository, TwitchConfigRepository} from "@streamcat/db"
import {TwitchOAuthProvider} from "../../../integrations/twitch/auth/twitch-oauth-provider"
import {TwitchChatClient} from "../../../integrations/twitch/chat/twitch-chat-client"
import {TwitchService} from "../../../integrations/twitch/services/twitch.service"

@Injectable()
export class TwitchConnectionService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly provider: TwitchOAuthProvider,
        private readonly authRepo: TwitchAuthRepository,
        private readonly configRepo: TwitchConfigRepository,
        private readonly requests: SongRequestRepository,
        private readonly chat: TwitchChatClient,
        logger: BotLoggerService,
        private readonly events: TwitchEventSubManager,
        private readonly twitchAuth: TwitchAuthProvider,
        private readonly twitch: TwitchService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async getProfilePictureUrl(guildId: string): Promise<string | null> {
        const account = await this.authRepo.findIdentityByGuildId(guildId)
        if (!account) return null
        try {
            const [profile] = await this.twitch.getUsersByIds([account.userId])
            return profile?.profilePictureUrl ?? null
        } catch (error) {
            this.logger.warn(`Could not load Twitch profile picture guild=${guildId} ${errorDetails(error)}`)
            return null
        }
    }

    createAuthorizationOptions(guildId: string): Omit<AuthFlowOptions, "userId"> {
        return {
            guildId,
            label: "Twitch",
            provider: this.provider,
            complete: (result) => this.saveConnection(guildId, result)
        }
    }

    async activateGuildAuth(
        guildId: string,
        userId: string,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
    ): Promise<void> {
        await this.twitchAuth.ensureInitialized()
        this.twitchAuth.addUser(userId, accessToken, refreshToken, expiresIn)
        const assignment = await this.requests.findByChannelId(userId)
        if (assignment?.guildId === guildId) {
            this.events.subscribeToRedemption(userId, guildId)
        } else {
            this.events.unsubscribeFromRedemptions(guildId)
        }
        this.logger.info(`Guild auth added for ${guildId} (user ${userId})`)
    }

    async removeGuildAuth(guildId: string): Promise<void> {
        this.events.unsubscribeFromRedemptions(guildId)
        const auth = await this.authRepo.findByGuildId(guildId)
        await this.authRepo.delete(guildId)
        if (auth) {
            this.logger.info(`Removed guild auth for ${guildId} (user ${auth.userId})`)
        }
        await this.chat.reconcile()
    }

    private async saveConnection(guildId: string, token: TwitchToken): Promise<void> {
        const username = token.username.toLowerCase()
        const channels = await this.configRepo.findByGuildId(guildId)
        const alreadyFollowed = channels.some((channel) => channel.channelId === token.userId)
        await this.authRepo.save(guildId, {...token, username})
        const assigned = await this.requests.assignChannel(guildId, token.userId)
        this.logger.info(`Twitch account saved guild=${guildId}`)
        if (!assigned)
            this.logger.info(`Twitch channel has another request server guild=${guildId} channel=${token.userId}`)

        // Credentials remain usable after a temporary runtime failure; startup restores them.
        try {
            await this.activateGuildAuth(guildId, token.userId, token.accessToken, token.refreshToken, token.expiresIn)
            if (!alreadyFollowed) await this.events.subscribeToStreamer(username)
            await this.chat.reconcile()
        } catch (error) {
            this.logger.error(`Twitch runtime activation failed guild=${guildId} ${errorDetails(error)}`)
            throw new Error("Twitch account saved, but activation failed. Please retry or restart the bot.", {
                cause: error
            })
        }
    }
}
