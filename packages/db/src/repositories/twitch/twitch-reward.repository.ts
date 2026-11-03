import type {TwitchRewardRecord} from "../../models/twitch/twitch-reward"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"
import type {TwitchRewardKind} from "@streamcat/interfaces"

@Injectable()
export class TwitchRewardRepository {
    constructor(private readonly prisma: PrismaService) {}

    findByRewardId(guildId: string, rewardId: string): Promise<TwitchRewardRecord | null> {
        return this.prisma.twitchReward.findUnique({where: {guildId_rewardId: {guildId, rewardId}}})
    }

    async hasKind(guildId: string, kind: TwitchRewardKind): Promise<boolean> {
        const reward = await this.prisma.twitchReward.findFirst({where: {guildId, kind}, select: {id: true}})
        return reward !== null
    }

    async saveKind(guildId: string, rewardId: string, kind: TwitchRewardKind): Promise<void> {
        await this.prisma.twitchReward.upsert({
            where: {guildId_rewardId: {guildId, rewardId}},
            update: {kind},
            create: {guildId, rewardId, kind}
        })
    }
}
