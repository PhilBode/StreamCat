import type {GuildConfigWithNotifications} from "../discord/guild-config"

export interface TwitchConfigRecord {
    guildId: string
    id: number
    username: string
    channelId: string
    mainStream: boolean
}

export interface TwitchConfigWithGuild extends TwitchConfigRecord {
    guild: GuildConfigWithNotifications
}
