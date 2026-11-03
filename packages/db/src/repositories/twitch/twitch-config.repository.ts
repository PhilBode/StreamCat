import type {TwitchConfigRecord, TwitchConfigWithGuild} from "../../models/twitch/twitch-config"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"

import type {TwitchFollow} from "../../dto/twitch/twitch-follow"

@Injectable()
export class TwitchConfigRepository {
    constructor(private readonly prisma: PrismaService) {}

    findMainByGuildId(guildId: string): Promise<TwitchConfigRecord | null> {
        return this.prisma.twitchConfig.findFirst({where: {guildId, mainStream: true}})
    }

    findByGuildIdAndUsername(guildId: string, username: string): Promise<TwitchConfigRecord | null> {
        return this.prisma.twitchConfig.findFirst({
            where: {
                guildId,
                username: {equals: username.toLowerCase(), mode: "insensitive"}
            }
        })
    }

    findByGuildId(guildId: string): Promise<TwitchConfigRecord[]> {
        return this.prisma.twitchConfig.findMany({where: {guildId}})
    }

    findAll(): Promise<TwitchConfigRecord[]> {
        return this.prisma.twitchConfig.findMany()
    }

    findByChannelId(channelId: string): Promise<TwitchConfigRecord[]> {
        return this.prisma.twitchConfig.findMany({where: {channelId}})
    }

    async findAllByChannelIdWithGuild(channelId: string): Promise<TwitchConfigWithGuild[]> {
        const followedStreams = await this.prisma.twitchConfig.findMany({
            where: {channelId},
            include: {guild: {include: {notificationConfig: true}}}
        })
        const streamsWithNotifications: TwitchConfigWithGuild[] = []

        for (const followedStream of followedStreams) {
            const notificationConfig = followedStream.guild.notificationConfig
            if (notificationConfig) {
                streamsWithNotifications.push({
                    ...followedStream,
                    guild: {...followedStream.guild, notificationConfig}
                })
            }
        }

        return streamsWithNotifications
    }

    async createIfMissing(follow: TwitchFollow): Promise<void> {
        await this.prisma.twitchConfig.upsert({
            where: {guildId_username: {guildId: follow.guildId, username: follow.username}},
            create: follow,
            update: {}
        })
    }

    async updateChannelId(guildId: string, username: string, channelId: string): Promise<void> {
        await this.prisma.twitchConfig.update({where: {guildId_username: {guildId, username}}, data: {channelId}})
    }

    async updateChannelIdByUsername(username: string, channelId: string): Promise<void> {
        await this.prisma.twitchConfig.updateMany({where: {username}, data: {channelId}})
    }

    async delete(guildId: string, username: string): Promise<void> {
        await this.prisma.twitchConfig.delete({where: {guildId_username: {guildId, username}}})
    }

    async deleteManyByGuildId(guildId: string): Promise<void> {
        await this.prisma.twitchConfig.deleteMany({where: {guildId}})
    }
}
