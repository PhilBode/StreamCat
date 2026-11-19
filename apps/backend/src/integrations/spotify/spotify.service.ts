import {type SpotifyConfigInput, type SpotifyConfigRecord, SpotifyConfigRepository} from "@streamcat/db"
import {Injectable, OnModuleDestroy, ServiceUnavailableException} from "@nestjs/common"
import {GuildSpotifyInstance, spotifyErrorDetails} from "./playback/guild-spotify-instance"
import {BotLoggerService, expiresInSeconds, type ModuleLogger} from "@streamcat/core"
import type {
    CurrentlyPlayingInfo,
    ISpotifyService,
    QueueResult,
    SpotifyInstanceToken,
    SpotifyPlaybackState,
    SpotifyQueue
} from "@streamcat/interfaces"

export function buildInstanceToken(config: SpotifyConfigRecord): SpotifyInstanceToken {
    return {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresIn: expiresInSeconds(config.expiresAt)
    }
}

@Injectable()
export class SpotifyService implements ISpotifyService, OnModuleDestroy {
    private readonly logger: ModuleLogger
    private readonly restoringInstances = new Map<string, Promise<GuildSpotifyInstance | undefined>>()
    private readonly connectionUpdates = new Map<string, Promise<void>>()
    private readonly connectionVersions = new Map<string, number>()
    private instances = new Map<string, GuildSpotifyInstance>()
    private destroyed = false

    constructor(
        private readonly spotifyConfigRepo: SpotifyConfigRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Spotify")
    }

    get instanceCount(): number {
        return this.instances.size
    }

    async init(): Promise<void> {
        const allConfigs = await this.spotifyConfigRepo.findAll()
        for (const config of allConfigs) {
            try {
                if (config.clientId && config.clientSecret && config.accessToken) {
                    this.replaceGuildInstance(config.guildId, buildInstanceToken(config))
                    this.logger.info(`Spotify initialized for guild ${config.guildId}`)
                }
            } catch (error) {
                this.logger.warn(`Spotify init failed guild=${config.guildId} ${spotifyErrorDetails(error)}`)
            }
        }
    }

    async start(): Promise<void> {
        for (const [guildId, instance] of [...this.instances]) {
            const refreshed = await instance.start()
            if (!refreshed && this.instances.get(guildId) === instance) {
                this.removeGuildInstance(guildId)
                this.logger.warn(`Spotify initialization failed guild=${guildId} reason=token_refresh_failed`)
            }
        }
    }

    async getCurrentlyPlaying(guildId: string): Promise<CurrentlyPlayingInfo | null> {
        return (await this.getOrRestoreInstance(guildId))?.getCurrentlyPlaying() ?? null
    }

    async getQueue(guildId: string): Promise<SpotifyQueue> {
        try {
            const instance = await this.getOrRestoreInstance(guildId)
            if (!instance) return {connected: false, tracks: []}
            return {connected: true, tracks: await instance.getQueue()}
        } catch (error) {
            this.logger.warn(`Could not load Spotify queue guild=${guildId} ${spotifyErrorDetails(error)}`)
            throw new ServiceUnavailableException(
                "Die Spotify-Queue konnte nicht geladen werden. Prüfe die Spotify-Verbindung und versuche es erneut."
            )
        }
    }

    async getProfilePictureUrl(guildId: string): Promise<string | null> {
        try {
            const instance = await this.getOrRestoreInstance(guildId)
            return instance ? await instance.getProfilePictureUrl() : null
        } catch (error) {
            this.logger.warn(`Could not load Spotify profile picture guild=${guildId} ${spotifyErrorDetails(error)}`)
            return null
        }
    }

    async getPlaybackState(guildId: string): Promise<SpotifyPlaybackState> {
        const instance = await this.getOrRestoreInstance(guildId)
        return (
            instance?.getPlaybackState() ?? {
                status: "disconnected",
                text: "Spotify ist noch nicht verbunden.",
                albumUrl: null
            }
        )
    }

    async tryToAddSongToQueue(content: string, guildId: string): Promise<QueueResult> {
        const instance = await this.getOrRestoreInstance(guildId)
        if (!instance) {
            return {success: false}
        }
        return await instance.tryToAddSongToQueue(content)
    }

    hasGuildInstance(guildId: string): boolean {
        return this.instances.has(guildId)
    }

    async ensureGuildInstance(guildId: string): Promise<boolean> {
        return Boolean(await this.getOrRestoreInstance(guildId))
    }

    async saveConnection(guildId: string, data: SpotifyConfigInput): Promise<void> {
        await this.serializeConnectionPersistence(guildId, async () => {
            if (this.destroyed) throw new Error("Spotify is shutting down. Please try again after restart.")
            const config = await this.spotifyConfigRepo.save(guildId, data)
            if (this.destroyed) throw new Error("Spotify account saved. Please restart the bot to activate it.")
            this.replaceGuildInstance(guildId, buildInstanceToken(config))
        })
    }

    private async serializeConnectionPersistence(guildId: string, update: () => Promise<void>): Promise<void> {
        const previous = this.connectionUpdates.get(guildId) ?? Promise.resolve()
        const pending = previous.catch(() => {}).then(update)
        this.connectionUpdates.set(guildId, pending)
        try {
            await pending
        } finally {
            if (this.connectionUpdates.get(guildId) === pending) this.connectionUpdates.delete(guildId)
        }
    }

    private async getOrRestoreInstance(guildId: string): Promise<GuildSpotifyInstance | undefined> {
        if (this.destroyed) return undefined
        const restoring = this.restoringInstances.get(guildId)
        if (restoring) {
            return restoring
        }
        const existing = this.instances.get(guildId)
        if (existing) {
            return existing
        }

        const restoration = this.restoreInstance(guildId)
        this.restoringInstances.set(guildId, restoration)
        try {
            return await restoration
        } finally {
            this.restoringInstances.delete(guildId)
        }
    }

    private async restoreInstance(guildId: string): Promise<GuildSpotifyInstance | undefined> {
        const version = this.connectionVersions.get(guildId)
        const config = await this.spotifyConfigRepo.findByGuildId(guildId)
        if (this.destroyed) return undefined
        if (this.connectionVersions.get(guildId) !== version) return this.instances.get(guildId)
        if (!config?.clientId || !config.clientSecret || !config.accessToken || !config.refreshToken) {
            return undefined
        }
        // An OAuth callback may have installed newer credentials while the lookup was pending.
        const existing = this.instances.get(guildId)
        if (existing) {
            return existing
        }
        const token = buildInstanceToken(config)
        this.replaceGuildInstance(guildId, token)
        const instance = this.instances.get(guildId)!
        if (token.expiresIn <= 60) {
            const refreshed = await instance.start()
            if (this.instances.get(guildId) !== instance) return this.instances.get(guildId)
            if (!refreshed) {
                this.removeGuildInstance(guildId)
                throw new Error("Spotify session could not be refreshed. Please try again or reconnect Spotify.")
            }
        }
        this.logger.info(`Spotify runtime restored from saved configuration guild=${guildId}`)
        return instance
    }

    replaceGuildInstance(guildId: string, token: SpotifyInstanceToken): void {
        if (this.destroyed) return
        this.removeGuildInstance(guildId)

        const instance = new GuildSpotifyInstance(
            token,
            this.logger,
            async (accessToken, refreshToken, expiresIn, isCurrent) => {
                await this.serializeConnectionPersistence(guildId, async () => {
                    if (!isCurrent() || this.instances.get(guildId) !== instance) return
                    await this.spotifyConfigRepo.updateTokens(guildId, {accessToken, refreshToken, expiresIn})
                })
            },
            guildId
        )
        this.instances.set(guildId, instance)
    }

    removeGuildInstance(guildId: string): void {
        this.connectionVersions.set(guildId, (this.connectionVersions.get(guildId) ?? 0) + 1)
        this.instances.get(guildId)?.dispose()
        this.instances.delete(guildId)
    }

    async disconnectGuild(guildId: string): Promise<boolean> {
        this.removeGuildInstance(guildId)
        const removed = await this.spotifyConfigRepo.delete(guildId)
        if (removed) this.logger.info(`Spotify connection removed guild=${guildId}`)
        return removed
    }

    async onModuleDestroy(): Promise<void> {
        this.destroyed = true
        for (const [guildId] of this.instances) {
            this.removeGuildInstance(guildId)
        }
    }
}
