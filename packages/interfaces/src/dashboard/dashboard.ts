export interface DashboardUser {
    id: string
    name: string
    avatar: string | null
}

export interface DashboardGuild {
    id: string
    name: string
    icon: string | null
    owner: boolean
    botPresent: boolean
    inviteUrl: string
}

export interface DashboardGuildDetails extends DashboardGuild {
    memberCount: number
    botReady: boolean
}

export interface DashboardConnections {
    twitch: {username: string} | null
    spotify: {username: string; clientId: string} | null
}

export interface SongRequestSettings {
    channelId: string | null
    assigned: boolean
    enabled: boolean
    chatCommandEnabled: boolean
    rewardIds: string[]
}

export interface SongRequestUpdate {
    enabled?: boolean
    chatCommandEnabled?: boolean
    rewardIds?: string[]
}

export interface SongRequestReward {
    id: string
    title: string
    cost: number
}
