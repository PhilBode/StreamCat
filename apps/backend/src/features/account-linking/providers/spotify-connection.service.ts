import {BadRequestException, Injectable} from "@nestjs/common"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import type {AuthFlowOptions} from "../services/oauth-flow.service"
import {SpotifyConfigRepository} from "@streamcat/db"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"
import {SpotifyOAuthProvider} from "../../../integrations/spotify/auth/spotify-oauth-provider"

@Injectable()
export class SpotifyConnectionService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly spotifyConfigRepo: SpotifyConfigRepository,
        private readonly spotifyService: SpotifyService,
        private readonly spotifyOAuth: SpotifyOAuthProvider,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Spotify")
    }

    async createAuthorizationOptions(
        guildId: string,
        clientId?: unknown,
        clientSecret?: unknown
    ): Promise<Omit<AuthFlowOptions, "userId">> {
        const existing = await this.spotifyConfigRepo.findByGuildId(guildId)
        const submittedClientId = typeof clientId === "string" ? clientId.trim() : ""
        const submittedClientSecret = typeof clientSecret === "string" ? clientSecret.trim() : ""
        const resolvedClientId = submittedClientId || existing?.clientId
        let resolvedClientSecret = submittedClientSecret

        // A saved secret belongs to its client ID; never reuse it for a different app.
        if (!resolvedClientSecret && resolvedClientId === existing?.clientId) {
            resolvedClientSecret = existing?.clientSecret ?? ""
        }
        if (!resolvedClientId || !/^[a-f0-9]{32}$/i.test(resolvedClientId)) {
            throw new BadRequestException("Please enter a valid Spotify client ID.")
        }
        if (resolvedClientSecret.length < 16 || resolvedClientSecret.length > 64) {
            throw new BadRequestException("Please enter a valid Spotify client secret for this app.")
        }
        return {
            guildId,
            provider: this.spotifyOAuth.withCredentials(resolvedClientId, resolvedClientSecret),
            label: "Spotify",
            complete: async (result) => {
                await this.spotifyService.saveConnection(guildId, {
                    clientId: resolvedClientId,
                    clientSecret: resolvedClientSecret,
                    username: result.username,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    tokenType: "Bearer",
                    expiresIn: result.expiresIn,
                    scope: result.scope
                })
                this.logger.info(`Spotify account saved and applied guild=${guildId}`)
            }
        }
    }

    async hasSavedCredentials(guildId: string): Promise<boolean> {
        const config = await this.spotifyConfigRepo.findByGuildId(guildId)
        return Boolean(config?.clientId && config?.clientSecret)
    }

    getProfilePictureUrl(guildId: string): Promise<string | null> {
        return this.spotifyService.getProfilePictureUrl(guildId)
    }
}
