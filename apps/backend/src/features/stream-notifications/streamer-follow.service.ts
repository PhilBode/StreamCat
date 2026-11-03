import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common"
import {TwitchConfigRepository} from "@streamcat/db"
import type {FollowedTwitchStreamer} from "@streamcat/interfaces"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {TwitchService} from "../../integrations/twitch/services/twitch.service"
import {TwitchEventSubManager} from "../../integrations/twitch/eventsub/twitch-event-sub-manager"

@Injectable()
export class StreamerFollowService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly api: TwitchService,
        private readonly events: TwitchEventSubManager,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async listStreamers(guildId: string): Promise<FollowedTwitchStreamer[]> {
        const follows = await this.twitchConfigRepo.findByGuildId(guildId)
        const profiles = await this.api.getUsersByIds(follows.map((follow) => follow.channelId).filter(Boolean))
        const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

        return follows.map((follow) => {
            const profile = profilesById.get(follow.channelId)
            return {
                channelId: follow.channelId,
                username: profile?.username ?? follow.username,
                displayName: profile?.displayName ?? follow.username,
                profilePictureUrl: profile?.profilePictureUrl ?? null,
                mainStream: follow.mainStream
            }
        })
    }

    async followStreamer(guildId: string, username: string): Promise<FollowedTwitchStreamer> {
        const user = username.trim().toLowerCase()
        const twitchUser = await this.api.getUserByName(user)
        const follows = await this.twitchConfigRepo.findByGuildId(guildId)
        const existing = follows.find(
            (follow) => follow.channelId === twitchUser.id || follow.username.toLowerCase() === twitchUser.username
        )
        if (existing?.mainStream) {
            throw new BadRequestException("You cannot follow yourself")
        }
        if (existing) {
            this.logger.info(`Streamer "${user}" already followed in guild ${guildId}`)
        } else {
            await this.twitchConfigRepo.createIfMissing({
                guildId,
                username: twitchUser.username,
                channelId: twitchUser.id
            })
            this.logger.info(`Guild ${guildId} followed streamer "${twitchUser.username}"`)
            await this.events.subscribeToStreamer(twitchUser.username)
        }
        return {
            channelId: twitchUser.id,
            username: twitchUser.username,
            displayName: twitchUser.displayName,
            profilePictureUrl: twitchUser.profilePictureUrl,
            mainStream: false
        }
    }

    async unfollowChannel(guildId: string, channelId: string): Promise<void> {
        const follows = await this.twitchConfigRepo.findByGuildId(guildId)
        const follow = follows.find((saved) => saved.channelId === channelId)
        if (!follow) throw new NotFoundException("Dieser Twitch-Kanal wird nicht mehr gefolgt.")
        await this.unfollowStreamer(guildId, follow.username)
    }

    async unfollowStreamer(guildId: string, username: string): Promise<void> {
        const user = username.toLowerCase()
        const existing = await this.twitchConfigRepo.findByGuildIdAndUsername(guildId, user)
        if (!existing) {
            this.logger.info(`Guild never followed "${user}"`)
            throw new NotFoundException(`Guild never followed "${user}"`)
        }
        if (existing.mainStream) {
            throw new BadRequestException("You cannot unfollow yourself")
        }
        await this.twitchConfigRepo.delete(guildId, existing.username)
        this.logger.info(`Guild ${guildId} unfollowed streamer "${user}"`)

        await this.events.unsubscribeFromStreamer(existing.channelId)
    }
}
