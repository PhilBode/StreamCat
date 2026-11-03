export type AssignedGuild = {
    guildId: string
    channelId: string
    enabled: boolean
}

export type SongRequestConfig = {
    guildId: string
    channelId: string | null
    enabled: boolean
    chatCommandEnabled: boolean
}
