import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"
import {TwitchRewardKind, type SongRequestUpdate} from "@streamcat/interfaces"
import type {AssignedGuild, SongRequestConfig} from "../../models/twitch/song-request"
import type {TwitchAuthOwner} from "../../models/twitch/twitch-auth-owner"

@Injectable()
export class SongRequestRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAssignedGuilds(): Promise<AssignedGuild[]> {
        const songRequestConfigs = await this.prisma.songRequestConfig.findMany({where: {channelId: {not: null}}})
        const assignedGuilds: AssignedGuild[] = []

        for (const config of songRequestConfigs) {
            if (config.channelId !== null) {
                assignedGuilds.push({...config, channelId: config.channelId})
            }
        }

        return assignedGuilds
    }

    findByChannelId(channelId: string): Promise<SongRequestConfig | null> {
        return this.prisma.songRequestConfig.findUnique({where: {channelId}})
    }

    findByGuildId(guildId: string): Promise<SongRequestConfig | null> {
        return this.prisma.songRequestConfig.findUnique({where: {guildId}})
    }

    assignChannel(guildId: string, channelId: string): Promise<boolean> {
        return this.saveSettings(guildId, channelId, {})
    }

    async findRewardIdsByGuildId(guildId: string): Promise<string[]> {
        const rewards = await this.prisma.twitchReward.findMany({
            where: {guildId, kind: TwitchRewardKind.SPOTIFY_SR},
            select: {rewardId: true}
        })
        return rewards.map((reward) => reward.rewardId)
    }

    async saveSettings(guildId: string, channelId: string, settings: SongRequestUpdate): Promise<boolean> {
        // A competing guild cannot replace an existing channel owner.
        try {
            return await this.prisma.$transaction(async (transaction) => {
                // Serialize with TwitchAuth.save so an old browser action cannot reclaim a previous channel.
                const [linkedAccount] = await transaction.$queryRaw<TwitchAuthOwner[]>`
                    SELECT "userId" FROM "TwitchAuth" WHERE "guildId" = ${guildId} FOR UPDATE
                `
                if (linkedAccount?.userId !== channelId) {
                    return false
                }

                const channelAssignment = await transaction.songRequestConfig.findUnique({where: {channelId}})
                if (channelAssignment && channelAssignment.guildId !== guildId) {
                    return false
                }

                await transaction.songRequestConfig.upsert({
                    where: {guildId},
                    create: {
                        guildId,
                        channelId,
                        enabled: settings.enabled,
                        chatCommandEnabled: settings.chatCommandEnabled
                    },
                    update: {
                        channelId,
                        enabled: settings.enabled,
                        chatCommandEnabled: settings.chatCommandEnabled
                    }
                })
                if (settings.rewardIds === undefined) {
                    return true
                }

                await transaction.twitchReward.deleteMany({where: {guildId, kind: TwitchRewardKind.SPOTIFY_SR}})
                if (settings.rewardIds.length > 0) {
                    await transaction.twitchReward.createMany({
                        data: settings.rewardIds.map((rewardId) => ({
                            guildId,
                            rewardId,
                            kind: TwitchRewardKind.SPOTIFY_SR
                        }))
                    })
                }
                return true
            })
        } catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
                return false
            }
            throw error
        }
    }

    async setEnabled(guildId: string, enabled: boolean): Promise<void> {
        await this.prisma.songRequestConfig.update({where: {guildId}, data: {enabled}})
    }
}
