import type {NotificationConfigRecord} from "../../models/discord/notification-config"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"

import type {NotificationSettings} from "../../dto/discord/notification-settings"

@Injectable()
export class NotificationConfigRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(guildId: string, settings: NotificationSettings): Promise<NotificationConfigRecord> {
        const guildConfig = await this.prisma.guildConfig.findUnique({where: {guildId}, select: {logChannel: true}})
        const defaultLiveChannel = settings.liveChannel ?? settings.partnerChannel ?? guildConfig?.logChannel

        if (!defaultLiveChannel) {
            throw new Error(`Cannot create notification config for guild ${guildId}: no channel available`)
        }

        return this.prisma.notificationConfig.upsert({
            where: {guildId},
            update: {
                liveChannel: settings.liveChannel,
                partnerChannel: settings.partnerChannel,
                mainStreamNotification: settings.mainStreamNotification,
                partnerStreamNotification: settings.partnerStreamNotification
            },
            create: {
                guildId,
                liveChannel: defaultLiveChannel,
                partnerChannel: settings.partnerChannel ?? defaultLiveChannel,
                mainStreamNotification: settings.mainStreamNotification,
                partnerStreamNotification: settings.partnerStreamNotification
            }
        })
    }
}
