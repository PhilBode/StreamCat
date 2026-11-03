import {Injectable, OnModuleDestroy} from "@nestjs/common"
import {ApiClient} from "@twurple/api"
import {RefreshingAuthProvider} from "@twurple/auth"
import {BotLoggerService, errorDetails, expiresInSeconds, requireEnv, type ModuleLogger} from "@streamcat/core"
import {TwitchBotAccountRepository} from "@streamcat/db"

export const TWITCH_BOT_SCOPES = ["user:read:chat", "user:write:chat"]

export interface TwitchBotAccountInput {
    userId: string
    username: string
    accessToken: string
    refreshToken: string
    expiresIn: number
    scope: string
}

export interface TwitchBotAccountRuntime {
    userId: string
    username: string
    client: ApiClient
}

@Injectable()
export class TwitchBotAccountService implements OnModuleDestroy {
    private readonly logger: ModuleLogger
    private operations: Promise<void> = Promise.resolve()
    private provider?: RefreshingAuthProvider
    private runtime?: TwitchBotAccountRuntime
    private account?: {userId: string; username: string}
    private loaded = false
    private healthy = false
    private shuttingDown = false
    private nextRecoveryAt = 0
    private recoveryDelay = 30_000
    private pendingTokens?: {
        userId: string
        accessToken: string
        refreshToken: string
        expiresAt: number
    }

    constructor(
        private readonly repository: TwitchBotAccountRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("TwitchBotAccount")
    }

    get status(): {configured: boolean; ready: boolean; userId: string | null; username: string | null} {
        return {
            configured: !!this.account,
            ready: !!this.getRuntime(),
            userId: this.account?.userId ?? null,
            username: this.account?.username ?? null
        }
    }

    getRuntime(): TwitchBotAccountRuntime | null {
        if (this.shuttingDown || !this.healthy || !this.runtime) return null
        return {...this.runtime}
    }

    async start(): Promise<void> {
        await this.serialize(async () => {
            if (this.loaded && (this.healthy || !this.account || Date.now() < this.nextRecoveryAt)) return
            try {
                if (this.pendingTokens) {
                    await this.persistPendingTokens()
                    return
                }
                const saved = await this.repository.findAccount()
                if (!saved) {
                    this.loaded = true
                    this.logger.warn(
                        "Twitch bot account is not configured; run /twitch-bot login as the installation owner. Channel point song requests still work, but chat commands and replies are inactive."
                    )
                    return
                }

                this.account = {userId: saved.userId, username: saved.username}
                if (!Number.isFinite(saved.expiresAt.getTime())) throw new Error("Invalid Twitch bot token expiry")
                const token = {...saved, expiresIn: expiresInSeconds(saved.expiresAt)}
                // A new provider clears Twurple's cached refresh failure without changing the saved account.
                const provider = this.createProvider(token)
                this.activate(token, provider)
                this.loaded = true
            } catch (error) {
                this.markUnhealthy()
                throw error
            }
        })
    }

    async save(input: TwitchBotAccountInput): Promise<void> {
        const token = {...input}
        const receivedAt = Date.now()
        await this.serialize(async () => {
            if (!Number.isFinite(token.expiresIn) || token.expiresIn < 0)
                throw new Error("Invalid Twitch bot token lifetime")
            token.expiresIn = Math.max(0, token.expiresIn - Math.ceil((Date.now() - receivedAt) / 1000))
            const provider = this.createProvider(token)
            await this.repository.save(token)
            this.activate(token, provider)
            this.recoveryDelay = 30_000
            this.nextRecoveryAt = 0
            this.loaded = true
        })
    }

    private createProvider(token: TwitchBotAccountInput): RefreshingAuthProvider {
        if (!token.accessToken || !token.refreshToken) throw new Error("Twitch bot tokens are missing")
        if (!Number.isFinite(token.expiresIn) || token.expiresIn < 0)
            throw new Error("Invalid Twitch bot token lifetime")
        const scopes = token.scope.split(/\s+/).filter(Boolean)
        if (!TWITCH_BOT_SCOPES.every((scope) => scopes.includes(scope))) {
            throw new Error("Twitch bot login requires user:read:chat and user:write:chat")
        }

        const provider = new RefreshingAuthProvider({
            clientId: requireEnv("TWITCH_APP_CLIENT_ID"),
            clientSecret: requireEnv("TWITCH_APP_SECRET")
        })
        provider.addUser(token.userId, {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresIn: token.expiresIn,
            obtainmentTimestamp: Date.now(),
            scope: scopes
        })
        let refreshToken = token.refreshToken
        provider.onRefresh((userId, refreshed) => {
            void this.serialize(async () => {
                if (this.provider !== provider || this.account?.userId !== userId) return
                const expiresIn = refreshed.expiresIn
                if (expiresIn === null || !Number.isFinite(expiresIn) || expiresIn <= 0) {
                    throw new Error("Invalid refreshed Twitch bot token lifetime")
                }
                if (!TWITCH_BOT_SCOPES.every((scope) => refreshed.scope.includes(scope))) {
                    throw new Error("Refreshed Twitch bot token lacks chat permissions")
                }
                const expiresAt = refreshed.obtainmentTimestamp + expiresIn * 1000
                if (!Number.isFinite(expiresAt)) throw new Error("Invalid refreshed Twitch bot expiry")
                refreshToken = refreshed.refreshToken ?? refreshToken
                // Retain rotated tokens if the database is temporarily unavailable.
                this.pendingTokens = {userId, accessToken: refreshed.accessToken, refreshToken, expiresAt}
                await this.persistPendingTokens()
            }).catch((error) => {
                if (this.provider !== provider || this.shuttingDown) return
                this.markUnhealthy()
                this.logger.error(`Twitch bot token persistence failed ${errorDetails(error)}`)
            })
        })
        provider.onRefreshFailure((userId, error) => {
            if (this.provider !== provider || this.account?.userId !== userId || this.shuttingDown) return
            this.markUnhealthy()
            this.logger.warn(`Twitch bot token refresh failed ${errorDetails(error)}`)
        })
        return provider
    }

    private async persistPendingTokens(): Promise<void> {
        const tokens = this.pendingTokens
        if (!tokens) return
        const expiresIn = Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 1000))
        await this.repository.updateTokens(tokens.userId, tokens.accessToken, tokens.refreshToken, expiresIn)
        this.pendingTokens = undefined
        this.healthy = true
        this.nextRecoveryAt = 0
        this.recoveryDelay = 30_000
    }

    private markUnhealthy(): void {
        this.healthy = false
        this.nextRecoveryAt = Date.now() + this.recoveryDelay
        this.recoveryDelay = Math.min(this.recoveryDelay * 2, 300_000)
    }

    private activate(token: TwitchBotAccountInput, provider: RefreshingAuthProvider): void {
        if (this.shuttingDown) {
            provider.removeUser(token.userId)
            return
        }
        this.removeRuntime()
        this.pendingTokens = undefined
        this.account = {userId: token.userId, username: token.username}
        this.provider = provider
        this.runtime = {userId: token.userId, username: token.username, client: new ApiClient({authProvider: provider})}
        this.healthy = true
        this.logger.info(`Twitch bot account activated user=${token.userId}`)
    }

    private serialize(operation: () => Promise<void>): Promise<void> {
        const result = this.operations.then(async () => {
            if (this.shuttingDown) throw new Error("Twitch bot account is shutting down")
            await operation()
        })
        this.operations = result.catch(() => {})
        return result
    }

    private removeRuntime(): void {
        if (this.provider && this.runtime) this.provider.removeUser(this.runtime.userId)
        this.provider = undefined
        this.runtime = undefined
        this.healthy = false
    }

    async onModuleDestroy(): Promise<void> {
        this.shuttingDown = true
        await this.operations
        this.removeRuntime()
        this.account = undefined
        this.loaded = false
    }
}
