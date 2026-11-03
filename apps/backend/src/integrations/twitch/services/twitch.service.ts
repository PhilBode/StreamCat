import {Injectable, NotFoundException, ServiceUnavailableException} from "@nestjs/common"
import type {HelixUser} from "@twurple/api"
import type {TwitchStreamData, TwitchUserProfile} from "@streamcat/interfaces"
import {BotLoggerService, errorDetails, ModuleLogger} from "@streamcat/core"
import {TwitchAuthProvider} from "../auth/twitch-auth-provider"

@Injectable()
export class TwitchService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly twitchAuth: TwitchAuthProvider,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async fetchRewards(
        userId: string
    ): Promise<Array<{id: string; title: string; cost: number; userInputRequired: boolean}>> {
        const rewards = await this.twitchAuth.getClient().channelPoints.getCustomRewards(userId, false)
        return rewards.map((reward) => ({
            id: reward.id,
            title: reward.title,
            cost: reward.cost,
            userInputRequired: reward.userInputRequired
        }))
    }

    async resolveUserId(twitchName: string): Promise<string> {
        const user = await this.getUserByName(twitchName.toLowerCase())
        this.logger.info(`Resolved "${twitchName}" to user ID ${user.id}`)
        return user.id
    }

    async fetchStreamData(channelId: string, displayName: string): Promise<TwitchStreamData> {
        const client = this.twitchAuth.getClient()
        const channelInfo = await client.channels.getChannelInfoById(channelId)
        const searchResult = (await client.search.searchChannels(displayName, {limit: 1})).data?.[0]
        this.logger.info(`Fetched stream data for "${displayName}"`)
        return {
            username: displayName,
            channelId,
            title: channelInfo?.title ?? "",
            profilePictureUrl: searchResult?.thumbnailUrl ?? "",
            game: channelInfo?.gameName ?? "None",
            startedAt: undefined
        }
    }

    async getUserByName(name: string): Promise<TwitchUserProfile> {
        let user: HelixUser | null
        try {
            user = await this.twitchAuth.getClient().users.getUserByName(name)
        } catch (error) {
            this.logger.warn(`Could not load Twitch user username=${name} ${errorDetails(error)}`)
            throw new ServiceUnavailableException("Twitch is currently unavailable. Please try again.")
        }
        if (!user) {
            this.logger.info(`Twitch user "${name}" not found`)
            throw new NotFoundException(`Twitch user "${name}" not found`)
        }
        return this.profile(user)
    }

    async getUsersByIds(userIds: string[]): Promise<TwitchUserProfile[]> {
        if (!userIds.length) return []
        const profiles: TwitchUserProfile[] = []
        try {
            const client = this.twitchAuth.getClient()
            // Twitch accepts at most 100 user IDs per request.
            for (let offset = 0; offset < userIds.length; offset += 100) {
                const users = await client.users.getUsersByIds(userIds.slice(offset, offset + 100))
                profiles.push(...users.map((user) => this.profile(user)))
            }
        } catch (error) {
            this.logger.warn(`Could not load Twitch profiles users=${userIds.length} ${errorDetails(error)}`)
            throw new ServiceUnavailableException("Twitch is currently unavailable. Please try again.")
        }
        return profiles
    }

    private profile(user: HelixUser): TwitchUserProfile {
        return {
            id: user.id,
            username: user.name,
            displayName: user.displayName,
            profilePictureUrl: user.profilePictureUrl
        }
    }
}
