import {TwitchConnectionService} from "../../features/account-linking/providers/twitch-connection.service"
import {Injectable} from "@nestjs/common"
import type {ITwitchBot, TwitchLiveInfo, TwitchStreamData} from "@streamcat/interfaces"
import {BotLoggerService, errorDetails, expiresInSeconds, type ModuleLogger} from "@streamcat/core"
import {TwitchAuthProvider} from "../../integrations/twitch/auth/twitch-auth-provider"
import {TwitchAuthRepository, TwitchConfigRepository} from "@streamcat/db"
import {TwitchEventSubManager} from "../../integrations/twitch/eventsub/twitch-event-sub-manager"
import {TwitchService} from "../../integrations/twitch/services/twitch.service"

@Injectable()
export class TwitchBot implements ITwitchBot {
    private readonly logger: ModuleLogger

    constructor(
        private readonly twitchAuthRepo: TwitchAuthRepository,
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly twitchAuth: TwitchAuthProvider,
        private readonly eventSubManager: TwitchEventSubManager,
        private readonly twitchService: TwitchService,
        logger: BotLoggerService,
        private readonly connections: TwitchConnectionService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async start(): Promise<void> {
        const guildAuths = await this.twitchAuthRepo.findAll()
        if (guildAuths.length === 0) {
            this.logger.info("No per-guild Twitch auths found. Use /twitch login to set up.")
        }

        for (const auth of guildAuths) {
            try {
                await this.addGuildAuth(
                    auth.guildId,
                    auth.userId,
                    auth.accessToken,
                    auth.refreshToken,
                    expiresInSeconds(auth.expiresAt)
                )
            } catch (err) {
                this.logger.warn(`Could not add guild auth guild=${auth.guildId} ${errorDetails(err)}`)
            }
        }
        // Restore tokens and desired reward listeners before opening EventSub connections.
        await this.eventSubManager.start()
    }

    async resolveUserId(username: string): Promise<string> {
        return this.twitchService.resolveUserId(username)
    }

    async fetchStreamData(username: string): Promise<TwitchStreamData> {
        const userId = await this.resolveUserId(username)
        return this.twitchService.fetchStreamData(userId, username)
    }

    async getLiveStreams(userIds: string[]): Promise<TwitchLiveInfo[]> {
        if (userIds.length === 0) return []
        let client
        try {
            client = this.twitchAuth.getClient()
        } catch (error) {
            this.logger.warn(`Could not get live streams channels=${userIds.join(",")} ${errorDetails(error)}`)
            return []
        }
        const liveStreams = await client.streams.getStreams({userId: userIds})
        return liveStreams.data.map((s) => ({
            userId: s.userId,
            userDisplayName: s.userDisplayName,
            gameName: s.gameName,
            viewers: s.viewers
        }))
    }

    async subscribeToStreamer(streamerName: string): Promise<void> {
        await this.eventSubManager.subscribeToStreamer(streamerName)
    }

    async unsubscribeFromStreamer(twitchUserId: string): Promise<void> {
        await this.eventSubManager.unsubscribeFromStreamer(twitchUserId)
    }

    async addGuildAuth(
        guildId: string,
        userId: string,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
    ): Promise<void> {
        await this.connections.activateGuildAuth(guildId, userId, accessToken, refreshToken, expiresIn)
    }

    async removeGuildFollows(guildId: string): Promise<void> {
        const follows = await this.twitchConfigRepo.findByGuildId(guildId)
        await this.twitchConfigRepo.deleteManyByGuildId(guildId)
        for (const follow of follows) {
            if (follow.channelId) await this.eventSubManager.unsubscribeFromStreamer(follow.channelId)
        }
    }

    async removeGuildAuth(guildId: string): Promise<void> {
        await this.connections.removeGuildAuth(guildId)
    }
}
