import type {NotificationConfigRecord} from "./notification-config"

export interface GuildConfigRecord {
    guildId: string
    logChannel: string
}

export interface GuildConfigWithNotifications extends GuildConfigRecord {
    notificationConfig: NotificationConfigRecord
}
