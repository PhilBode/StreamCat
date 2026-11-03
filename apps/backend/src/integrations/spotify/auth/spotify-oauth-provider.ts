import {Injectable, ServiceUnavailableException} from "@nestjs/common"
import {spotifyCallbackUrl} from "@streamcat/core"
import type {OAuthProvider, OAuthTokenResult, OAuthUserInfo} from "@streamcat/interfaces"

const SPOTIFY_SCOPES = [
    "user-read-email",
    "user-read-private",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-read-playback-state"
]

@Injectable()
export class SpotifyOAuthProvider {
    withCredentials(clientId: string, clientSecret: string): OAuthProvider {
        const redirectUri = spotifyCallbackUrl()
        return {
            getAuthUrl(state: string): string {
                // Preserve the existing authorization URL encoding and parameter order.
                return `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(SPOTIFY_SCOPES.join(" "))}`
            },
            async exchangeCode(code: string): Promise<OAuthTokenResult> {
                const response = await fetch("https://accounts.spotify.com/api/token", {
                    method: "POST",
                    signal: AbortSignal.timeout(10_000),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
                    },
                    body: new URLSearchParams({grant_type: "authorization_code", code, redirect_uri: redirectUri})
                })
                if (!response.ok)
                    throw Object.assign(new ServiceUnavailableException("Spotify token exchange failed."), {
                        upstreamStatus: response.status
                    })
                const data = (await response.json()) as {
                    access_token: string
                    refresh_token: string
                    expires_in: number
                    scope?: string
                }
                return {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresIn: data.expires_in,
                    scope: data.scope ?? ""
                }
            },
            async fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
                const response = await fetch("https://api.spotify.com/v1/me", {
                    signal: AbortSignal.timeout(10_000),
                    headers: {Authorization: `Bearer ${accessToken}`}
                })
                if (!response.ok)
                    throw Object.assign(new ServiceUnavailableException("Spotify profile request failed."), {
                        upstreamStatus: response.status
                    })
                const data = (await response.json()) as {id: string; display_name?: string}
                return {userId: data.id, username: data.display_name || data.id}
            }
        }
    }
}
