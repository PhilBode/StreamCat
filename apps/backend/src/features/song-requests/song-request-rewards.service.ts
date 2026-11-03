import {Injectable} from "@nestjs/common"
import {TwitchAuthRepository, TwitchConfigRepository, TwitchRewardRepository} from "@streamcat/db"
import {TwitchRewardKind} from "@streamcat/interfaces"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {TwitchService} from "../../integrations/twitch/services/twitch.service"

@Injectable()
export class SongRequestRewardsService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly twitchAuthRepo: TwitchAuthRepository,
        private readonly twitchRewardRepo: TwitchRewardRepository,
        private readonly twitch: TwitchService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async setSongRequestReward(
        guildId: string,
        rewardId: string
    ): Promise<{username: string; rewardTitle: string} | null> {
        const mainStreamer = await this.twitchConfigRepo.findMainByGuildId(guildId)
        if (!mainStreamer) {
            this.logger.warn(`No main streamer found for guild ${guildId} — cannot set song request reward`)
            return null
        }
        const rewards = await this.getForGuild(guildId)
        const reward = rewards.find((r) => r.id === rewardId)
        if (!reward) {
            throw new Error(`Reward ${rewardId} not found on this channel (or it does not accept text input)`)
        }
        await this.twitchRewardRepo.saveKind(guildId, rewardId, TwitchRewardKind.SPOTIFY_SR)
        this.logger.info(`Song request reward set to ${rewardId} ("${reward.title}") for guild ${guildId}`)
        return {username: mainStreamer.username, rewardTitle: reward.title}
    }

    async getForGuild(guildId: string): Promise<{id: string; title: string; cost: number}[]> {
        const mainStreamer = await this.twitchConfigRepo.findMainByGuildId(guildId)
        if (!mainStreamer) {
            this.logger.warn(`No main streamer found for guild ${guildId} — cannot fetch rewards`)
            return []
        }
        const guildAuth = await this.twitchAuthRepo.findByGuildId(guildId)
        if (!guildAuth) {
            this.logger.warn(`No Twitch auth found for guild ${guildId} — cannot fetch rewards`)
            return []
        }
        const rewards = await this.twitch.fetchRewards(guildAuth.userId)
        const validRewards = rewards.filter((r) => r.userInputRequired)
        this.logger.info(`Fetched ${validRewards.length} rewards with text input for guild ${guildId}`)
        return validRewards.map((r) => ({id: r.id, title: r.title, cost: r.cost}))
    }
}
