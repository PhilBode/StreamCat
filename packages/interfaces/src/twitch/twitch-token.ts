export interface TwitchToken {
    accessToken: string
    refreshToken: string
    userId: string
    username: string
    expiresIn: number
    scope?: string
}
