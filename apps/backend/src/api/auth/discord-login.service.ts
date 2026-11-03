import {HttpException, Injectable, ServiceUnavailableException, UnauthorizedException} from "@nestjs/common"
import {BotLoggerService, errorDetails, frontendUrl, requireEnv, type ModuleLogger} from "@streamcat/core"
import {WebSessionRepository, type WebSessionRecord} from "@streamcat/db"
import {randomBytes} from "node:crypto"
import type {Request} from "express"
import {cookieValue, SESSION_COOKIE, SESSION_SECONDS, sessionHash} from "./auth-security"

const REQUIRED_SCOPES = ["identify", "guilds"]

interface DiscordTokens {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
}

export interface DiscordUserGuild {
    id: string
    name: string
    icon: string | null
    owner: boolean
    permissions: string
}

@Injectable()
export class DiscordLoginService {
    private readonly refreshes = new Map<string, Promise<WebSessionRecord>>()
    private readonly logger: ModuleLogger

    constructor(
        private readonly sessions: WebSessionRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("DiscordLogin")
    }

    callbackUrl(): string {
        return `${frontendUrl()}/callback/discord`
    }

    loginUrl(state: string): string {
        this.checkConfiguration()
        const url = new URL("https://discord.com/oauth2/authorize")
        url.search = new URLSearchParams({
            client_id: requireEnv("AUTH_DISCORD_ID"),
            redirect_uri: this.callbackUrl(),
            response_type: "code",
            scope: REQUIRED_SCOPES.join(" "),
            state
        }).toString()
        return url.toString()
    }

    async completeLogin(code: string, previousToken: string | null): Promise<string> {
        let stage = "token_exchange"
        try {
            const tokens = await this.exchange({
                grant_type: "authorization_code",
                code,
                redirect_uri: this.callbackUrl()
            })
            stage = "user_profile"
            const user = await this.discord<{
                id: string
                username: string
                global_name: string | null
                avatar: string | null
            }>("/users/@me", tokens.access_token)
            if (!/^\d+$/.test(user.id) || typeof user.username !== "string")
                throw new UnauthorizedException("Discord-Anmeldung fehlgeschlagen.")
            const token = randomBytes(32).toString("hex")
            stage = "session_create"
            await this.sessions.create({
                id: sessionHash(token),
                userId: user.id,
                name: user.global_name || user.username,
                avatar: user.avatar,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000)
            })
            stage = "previous_session_delete"
            if (previousToken) await this.sessions.delete(sessionHash(previousToken))
            this.logger.info("Discord login completed; session created")
            return token
        } catch (error) {
            const status = error instanceof HttpException ? error.getStatus() : "internal"
            this.logger.error(`Discord login failed stage=${stage} status=${status} ${errorDetails(error)}`)
            throw error
        }
    }

    async session(req: Request): Promise<WebSessionRecord> {
        const token = cookieValue(req.headers.cookie, SESSION_COOKIE)
        if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException("Bitte mit Discord anmelden.")
        const session = await this.sessions.findById(sessionHash(token))
        if (!session || session.expiresAt.getTime() <= Date.now()) {
            if (session) await this.sessions.delete(session.id)
            throw new UnauthorizedException("Bitte erneut mit Discord anmelden.")
        }
        if (session.tokenExpiresAt.getTime() > Date.now() + 60_000) return session
        const pending = this.refreshes.get(session.id)
        if (pending) return pending
        const refresh = this.refresh(session)
        this.refreshes.set(session.id, refresh)
        try {
            return await refresh
        } finally {
            this.refreshes.delete(session.id)
        }
    }

    async logout(req: Request): Promise<void> {
        const token = cookieValue(req.headers.cookie, SESSION_COOKIE)
        if (token) await this.sessions.delete(sessionHash(token))
    }

    async guilds(session: WebSessionRecord): Promise<DiscordUserGuild[]> {
        try {
            return await this.discord<DiscordUserGuild[]>("/users/@me/guilds?limit=200", session.accessToken)
        } catch (error) {
            if (error instanceof UnauthorizedException) await this.sessions.delete(session.id)
            throw error
        }
    }

    private async refresh(session: WebSessionRecord): Promise<WebSessionRecord> {
        try {
            const current = await this.sessions.findById(session.id)
            if (!current || current.expiresAt.getTime() <= Date.now())
                throw new UnauthorizedException("Bitte erneut anmelden.")
            if (current.tokenExpiresAt.getTime() > Date.now() + 60_000) return current
            session = current
            const tokens = await this.exchange({grant_type: "refresh_token", refresh_token: session.refreshToken})
            const refreshed = {
                ...session,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000)
            }
            await this.sessions.updateTokens(
                session.id,
                refreshed.accessToken,
                refreshed.refreshToken,
                refreshed.tokenExpiresAt
            )
            return refreshed
        } catch (error) {
            if (error instanceof UnauthorizedException) await this.sessions.delete(session.id)
            throw error
        }
    }

    private async exchange(params: Record<string, string>): Promise<DiscordTokens> {
        this.checkConfiguration()
        const response = await this.request("https://discord.com/api/v10/oauth2/token", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams({
                ...params,
                client_id: requireEnv("AUTH_DISCORD_ID"),
                client_secret: requireEnv("AUTH_DISCORD_SECRET")
            })
        })
        if (!response.ok) {
            const body = (await response.json().catch(() => null)) as {error?: unknown} | null
            const knownErrors = [
                "invalid_client",
                "invalid_grant",
                "invalid_request",
                "invalid_scope",
                "unauthorized_client",
                "unsupported_grant_type"
            ]
            const reason = typeof body?.error === "string" && knownErrors.includes(body.error) ? body.error : "unknown"
            this.logger.warn(
                `Discord token exchange rejected grant=${params.grant_type} http_status=${response.status} reason=${reason}`
            )
            if ([400, 401, 403].includes(response.status))
                throw new UnauthorizedException("Discord-Anmeldung abgelaufen. Bitte erneut anmelden.")
            throw new ServiceUnavailableException("Discord ist momentan nicht erreichbar.")
        }
        const tokens: DiscordTokens = await response.json()
        const hasTokens = !!tokens.access_token && !!tokens.refresh_token
        const isBearer = tokens.token_type?.toLowerCase() === "bearer"
        const hasValidLifetime = Number.isFinite(tokens.expires_in) && tokens.expires_in > 0
        const scopes = tokens.scope?.split(" ") ?? []
        const hasRequiredScopes = REQUIRED_SCOPES.every((scope) => scopes.includes(scope))
        if (!hasTokens || !isBearer || !hasValidLifetime || !hasRequiredScopes) {
            throw new UnauthorizedException("Discord hat die benötigten Berechtigungen nicht erteilt.")
        }
        return tokens
    }

    private async discord<T>(path: string, token: string): Promise<T> {
        const response = await this.request(`https://discord.com/api/v10${path}`, {
            headers: {Authorization: `Bearer ${token}`}
        })
        if (!response.ok)
            this.logger.warn(`Discord API rejected path=${path.split("?")[0]} http_status=${response.status}`)
        if ([401, 403].includes(response.status)) throw new UnauthorizedException("Bitte erneut mit Discord anmelden.")
        if (response.status === 429)
            throw new ServiceUnavailableException(
                "Discord begrenzt gerade die Anfragen. Bitte warte kurz und versuche es erneut."
            )
        if (!response.ok) throw new ServiceUnavailableException("Discord ist momentan nicht erreichbar.")
        return response.json() as Promise<T>
    }

    private async request(url: string, init: RequestInit): Promise<Response> {
        try {
            return await fetch(url, {...init, signal: AbortSignal.timeout(10_000)})
        } catch (error) {
            this.logger.error(
                `Discord request failed path=${new URL(url).pathname} reason=network_or_timeout ${errorDetails(error)}`
            )
            throw new ServiceUnavailableException("Discord ist momentan nicht erreichbar.", {cause: error})
        }
    }

    private checkConfiguration(): void {
        const missing = ["AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET"].filter((key) => !process.env[key]?.trim())
        if (missing.length) {
            this.logger.error(`Discord OAuth configuration missing: ${missing.join(", ")}`)
            throw new ServiceUnavailableException("Discord-Anmeldung ist noch nicht konfiguriert.")
        }
    }
}
