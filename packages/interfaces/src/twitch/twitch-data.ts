export interface TwitchLiveInfo {
    userId: string
    userDisplayName: string
    gameName?: string
    viewers: number
}

export interface TwitchUserProfile {
    id: string
    username: string
    displayName: string
    profilePictureUrl: string
}

export interface FollowedTwitchStreamer {
    channelId: string
    username: string
    displayName: string
    profilePictureUrl: string | null
    mainStream: boolean
}

export interface TwitchStreamData {
    username: string
    channelId: string
    title: string
    profilePictureUrl: string
    game: string
    startedAt?: Date
}
