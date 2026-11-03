import {Injectable, OnModuleDestroy} from "@nestjs/common"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import type {OverlayPlayback} from "@streamcat/interfaces"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"

@Injectable()
export class OverlayPlaybackService implements OnModuleDestroy {
    private readonly logger: ModuleLogger
    private readonly cache = new Map<string, {expiresAt: number; value: Promise<OverlayPlayback>}>()

    constructor(
        private readonly spotify: SpotifyService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("OverlayPlayback")
    }

    get(guildId: string): Promise<OverlayPlayback> {
        const cached = this.cache.get(guildId)
        if (cached && cached.expiresAt > Date.now()) return cached.value
        const entry = {expiresAt: Infinity, value: this.load(guildId)}
        this.cache.set(guildId, entry)
        void entry.value.then(() => {
            entry.expiresAt = Date.now() + 5000
        })
        return entry.value
    }

    private async load(guildId: string): Promise<OverlayPlayback> {
        try {
            return await this.spotify.getPlaybackState(guildId)
        } catch (error) {
            this.logger.warn(`Overlay playback failed guild=${guildId} ${errorDetails(error)}`)
            return {status: "error", text: "Spotify-Verbindung prüfen oder erneut verbinden.", albumUrl: null}
        }
    }

    onModuleDestroy(): void {
        this.cache.clear()
    }
}
