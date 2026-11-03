export interface WebSessionRecord {
    id: string
    userId: string
    name: string
    avatar: string | null
    accessToken: string
    refreshToken: string
    tokenExpiresAt: Date
    expiresAt: Date
}
