export interface OAuthTokenResult {
    accessToken: string
    refreshToken: string
    expiresIn: number
    scope: string
}

export interface OAuthUserInfo {
    userId: string
    username: string
}

export interface OAuthProvider {
    getAuthUrl(state: string): string

    exchangeCode(code: string, state?: string): Promise<OAuthTokenResult>

    fetchUserInfo(accessToken: string): Promise<OAuthUserInfo>
}
