import {oauthFailureMessage, providerFailureReason, type OAuthFailureReason} from "../helpers/oauth-failure"
import {randomUUID} from "node:crypto"
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    OnModuleDestroy
} from "@nestjs/common"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import type {OAuthProvider, OAuthTokenResult, OAuthUserInfo} from "@streamcat/interfaces"

export type AuthResult = OAuthTokenResult & OAuthUserInfo
type BrowserSession = {id: string; userId: string}
type SessionResolver = () => Promise<BrowserSession>
interface AuthFlow {
    url: string
    result: Promise<AuthResult>
}
interface AuthCallbackResult {
    success: boolean
    returnTo?: string
    reason?: OAuthFailureReason
}

export interface AuthFlowOptions {
    guildId: string
    userId: string
    provider: OAuthProvider
    label: "Twitch" | "Spotify"
    scope?: "guild" | "installation"
    sessionId?: string
    complete: (result: AuthResult) => Promise<void>
    returnTo?: string
}
interface PendingAuth extends AuthFlowOptions {
    expiresAt: number
    used: boolean
    resolve: (result: AuthResult) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
}

@Injectable()
export class OAuthFlowService implements OnModuleDestroy {
    private readonly logger: ModuleLogger
    private readonly store = new Map<string, PendingAuth>()

    constructor(
        logger: BotLoggerService,
        private readonly access: GuildAccessService
    ) {
        this.logger = logger.forModule("ProviderAuth")
    }

    async requireAdmin(guildId: string, userId: string): Promise<void> {
        await this.access.requireAdmin(guildId, userId)
    }

    async begin(options: AuthFlowOptions): Promise<AuthFlow> {
        await this.authorizeInitiator(options)
        for (const [state, pending] of this.store) {
            if (pending.label !== options.label || (pending.scope ?? "guild") !== (options.scope ?? "guild")) {
                continue
            }
            if (options.scope !== "installation" && pending.guildId !== options.guildId) continue
            if (pending.used) {
                throw new ConflictException("This authorization is being completed. Please try again shortly.")
            }
            this.remove(state, pending, "A new login was started.")
        }
        const state = randomUUID()
        const url = options.provider.getAuthUrl(state)
        let resolve!: PendingAuth["resolve"]
        let reject!: PendingAuth["reject"]
        const result = new Promise<AuthResult>((accept, fail) => {
            resolve = accept
            reject = fail
        })
        // Web flows complete in the callback; Discord flows also await this promise.
        void result.catch(() => {})
        const timer = setTimeout(() => {
            const pending = this.store.get(state)
            if (pending && !pending.used) {
                this.remove(state, pending, "OAuth callback timed out. Please start authorization again.")
            }
        }, 5 * 60_000)
        timer.unref()
        this.store.set(state, {
            ...options,
            expiresAt: Date.now() + 5 * 60_000,
            used: false,
            resolve,
            reject,
            timer
        })
        this.logger.info(`OAuth started provider=${options.label} guild=${options.guildId} user=${options.userId}`)
        return {url, result}
    }

    async finish(
        label: "Twitch" | "Spotify",
        query: Record<string, string>,
        resolveSession?: SessionResolver
    ): Promise<AuthCallbackResult> {
        const pending = typeof query.state === "string" ? this.store.get(query.state) : undefined
        if (!pending || pending.used || pending.label !== label || pending.expiresAt <= Date.now()) {
            this.logger.warn(`OAuth rejected provider=${label} reason=invalid_expired_or_used_state`)
            throw new BadRequestException("Invalid or expired login. Please start authorization again.")
        }
        pending.used = true
        clearTimeout(pending.timer)
        let stage = "authorization"
        let reason: OAuthFailureReason | undefined
        try {
            await this.authorizeCallback(pending, resolveSession)
            stage = "callback_validation"
            if (query.error !== undefined) {
                reason = providerFailureReason(query.error)
                throw new BadRequestException("The provider rejected authorization.")
            }
            if (typeof query.code !== "string" || !query.code.trim()) {
                reason = "missing_or_invalid_code"
                throw new BadRequestException("Missing authorization code in callback.")
            }
            stage = "token_exchange"
            const token = await pending.provider.exchangeCode(query.code, query.state)
            this.validateTokens(token)
            stage = "user_profile"
            const user = await pending.provider.fetchUserInfo(token.accessToken)
            this.validateUser(user)
            stage = "authorization"
            await this.authorizeCallback(pending, resolveSession)
            stage = "persist_and_apply"
            const result = {...token, ...user}
            await pending.complete(result)
            pending.resolve(result)
            this.logger.info(`OAuth completed provider=${label} guild=${pending.guildId}`)
            return {success: true, returnTo: pending.returnTo}
        } catch (error) {
            this.logFailure(error, pending, stage, reason)
            pending.reject(new Error(oauthFailureMessage(label, reason)))
            return {success: false, returnTo: pending.returnTo, reason}
        } finally {
            this.store.delete(query.state)
        }
    }

    private async authorizeCallback(pending: PendingAuth, resolveSession?: SessionResolver): Promise<void> {
        if (pending.sessionId) {
            const session = await resolveSession?.()
            if (session?.id !== pending.sessionId || session?.userId !== pending.userId) {
                throw new ForbiddenException("Please complete authorization in the original browser.")
            }
        }
        await this.authorizeInitiator(pending)
    }

    private async authorizeInitiator(options: AuthFlowOptions): Promise<void> {
        if (options.scope === "installation") {
            await this.access.requireInstallationOwner(options.userId)
            return
        }
        await this.requireAdmin(options.guildId, options.userId)
    }

    private validateTokens(token: OAuthTokenResult): void {
        if (!token.accessToken || !token.refreshToken || !Number.isFinite(token.expiresIn) || token.expiresIn <= 0) {
            throw new BadRequestException("The provider did not return a valid session.")
        }
    }

    private validateUser(user: OAuthUserInfo): void {
        if (!user.userId || !user.username) {
            throw new BadRequestException("The account could not be verified.")
        }
    }

    private logFailure(error: unknown, pending: PendingAuth, stage: string, reason?: OAuthFailureReason): void {
        const status = error instanceof HttpException ? error.getStatus() : "internal"
        const fields = [
            `OAuth failed provider=${pending.label} guild=${pending.guildId} stage=${stage} status=${status}`
        ]
        if (reason) fields.push(`reason=${reason}`)
        const upstreamStatus = (error as {upstreamStatus?: unknown})?.upstreamStatus
        if (typeof upstreamStatus === "number" && upstreamStatus >= 400 && upstreamStatus <= 599) {
            fields.push(`upstream_status=${upstreamStatus}`)
        }
        fields.push(errorDetails(error))
        this.logger.error(fields.join(" "))
    }

    private remove(state: string, pending: PendingAuth, message: string): void {
        this.store.delete(state)
        clearTimeout(pending.timer)
        pending.reject(new Error(message))
        this.logger.warn(`OAuth cancelled provider=${pending.label} guild=${pending.guildId}`)
    }

    onModuleDestroy(): void {
        for (const [state, pending] of this.store)
            this.remove(state, pending, "The bot is restarting. Please start authorization again.")
    }
}
