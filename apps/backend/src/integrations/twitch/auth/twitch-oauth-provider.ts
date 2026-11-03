import {Injectable} from "@nestjs/common"
import {requireEnv, twitchCallbackUrl} from "@streamcat/core"
import {TwitchScopes} from "./scopes"
import type {OAuthProvider, OAuthTokenResult, OAuthUserInfo} from "@streamcat/interfaces"

@Injectable()
export class TwitchOAuthProvider implements OAuthProvider {
    getAuthUrl(state: string): string {
        return this.authorizationUrl(state, TwitchScopes.scopes)
    }

    withScopes(scopes: readonly string[]): OAuthProvider {
        return {
            getAuthUrl: (state) => `${this.authorizationUrl(state, scopes)}&force_verify=true`,
            exchangeCode: (code) => this.exchangeCode(code),
            fetchUserInfo: (accessToken) => this.fetchUserInfo(accessToken)
        }
    }

    private authorizationUrl(state: string, requestedScopes: readonly string[]): string {
        const clientId = requireEnv("TWITCH_APP_CLIENT_ID")
        const redirectUri = encodeURIComponent(twitchCallbackUrl())
        const scopes = encodeURIComponent(requestedScopes.join(" "))
        return (
            `https://id.twitch.tv/oauth2/authorize` +
            `?client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&state=${encodeURIComponent(state)}` +
            `&scope=${scopes}`
        )
    }

    async exchangeCode(code: string): Promise<OAuthTokenResult> {
        const clientId = requireEnv("TWITCH_APP_CLIENT_ID")
        const clientSecret = requireEnv("TWITCH_APP_SECRET")

        const tokenResp = await fetch("https://id.twitch.tv/oauth2/token", {
            signal: AbortSignal.timeout(10_000),
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: twitchCallbackUrl()
            })
        })

        if (!tokenResp.ok) {
            throw Object.assign(new Error("Twitch token exchange failed."), {upstreamStatus: tokenResp.status})
        }

        const tokenData = (await tokenResp.json()) as {
            access_token: string
            refresh_token?: string
            expires_in: number
            scope?: string[]
        }

        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? "",
            expiresIn: tokenData.expires_in,
            scope: tokenData.scope?.join(" ") ?? ""
        }
    }

    async fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
        const clientId = requireEnv("TWITCH_APP_CLIENT_ID")

        const userResp = await fetch("https://api.twitch.tv/helix/users", {
            signal: AbortSignal.timeout(10_000),
            headers: {
                "Client-ID": clientId,
                Authorization: `Bearer ${accessToken}`
            }
        })

        if (!userResp.ok)
            throw Object.assign(new Error("Twitch profile request failed."), {upstreamStatus: userResp.status})
        const userData = (await userResp.json()) as {data?: {id?: string; display_name?: string}[]}
        const userId = userData.data?.[0]?.id ?? ""
        const username = userData.data?.[0]?.display_name ?? ""

        return {userId, username}
    }
}
