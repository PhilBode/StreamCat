import type {GuildConfigRecord, GuildConfigWithNotifications} from "../../models/discord/guild-config"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"

@Injectable()
export class GuildConfigRepository {
    constructor(private readonly prisma: PrismaService) {}

    findByGuildId(guildId: string): Promise<GuildConfigRecord | null> {
        return this.prisma.guildConfig.findUnique({where: {guildId}})
    }

    async findByGuildIdWithNotifications(guildId: string): Promise<GuildConfigWithNotifications | null> {
        const guildConfig = await this.prisma.guildConfig.findUnique({
            where: {guildId},
            include: {notificationConfig: true}
        })
        if (!guildConfig) {
            return null
        }
        const notificationConfig = guildConfig.notificationConfig
        if (!notificationConfig) {
            throw new Error(`NotificationConfig missing for guild ${guildId}`)
        }
        return {...guildConfig, notificationConfig}
    }

    findAll(): Promise<GuildConfigRecord[]> {
        return this.prisma.guildConfig.findMany()
    }

    saveLogChannel(guildId: string, logChannel: string): Promise<GuildConfigRecord> {
        return this.prisma.guildConfig.upsert({
            where: {guildId},
            update: {logChannel},
            create: {guildId, logChannel}
        })
    }

    async delete(guildId: string): Promise<void> {
        await this.prisma.guildConfig.delete({where: {guildId}})
    }
}
