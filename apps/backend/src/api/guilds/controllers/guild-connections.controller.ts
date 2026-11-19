import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"
import type {GuildRequest} from "../../auth/models/authenticated-request"
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Header,
    Param,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common"
import type {Response} from "express"
import {frontendUrl} from "@streamcat/core"
import {SpotifyConfigRepository, TwitchAuthRepository} from "@streamcat/db"
import type {DashboardConnections} from "@streamcat/interfaces"
import {OAuthFlowService, type AuthFlowOptions} from "../../../features/account-linking/services/oauth-flow.service"
import {SpotifyConnectionService} from "../../../features/account-linking/providers/spotify-connection.service"
import {TwitchConnectionService} from "../../../features/account-linking/providers/twitch-connection.service"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"

@Controller("dashboard/guilds/:guildId/connections")
@UseGuards(SessionGuard, GuildAdminGuard)
export class GuildConnectionsController {
    constructor(
        private readonly flow: OAuthFlowService,
        private readonly spotifyAuth: SpotifyConnectionService,
        private readonly twitchAuth: TwitchConnectionService,
        private readonly spotify: SpotifyService,
        private readonly spotifyRepo: SpotifyConfigRepository,
        private readonly twitchRepo: TwitchAuthRepository
    ) {}

    @Get()
    @Header("Cache-Control", "private, no-store")
    async connections(@Param("guildId") guildId: string): Promise<DashboardConnections> {
        const [spotify, twitch] = await Promise.all([
            this.spotifyRepo.findAccountInfoByGuildId(guildId),
            this.twitchRepo.findIdentityByGuildId(guildId)
        ])
        return {
            spotify: spotify ? {username: spotify.username, clientId: spotify.clientId} : null,
            twitch: twitch ? {username: twitch.username} : null
        }
    }

    @Get(":provider/avatar")
    @Header("Cache-Control", "private, no-store")
    async avatar(
        @Param("guildId") guildId: string,
        @Param("provider") provider: string,
        @Res() response: Response
    ): Promise<void> {
        if (provider !== "twitch" && provider !== "spotify") throw new BadRequestException("Unbekannter Anbieter.")
        const url = await (provider === "twitch" ? this.twitchAuth : this.spotifyAuth).getProfilePictureUrl(guildId)
        if (!url) {
            response.status(204).end()
            return
        }
        response.redirect(url)
    }

    @Delete(":provider")
    @Header("Cache-Control", "private, no-store")
    async disconnect(
        @Param("guildId") guildId: string,
        @Param("provider") provider: string
    ): Promise<{success: boolean}> {
        if (provider !== "spotify" && provider !== "twitch") throw new BadRequestException("Unbekannter Anbieter.")
        const success =
            provider === "spotify"
                ? await this.spotify.disconnectGuild(guildId)
                : await this.twitchAuth.removeGuildAuth(guildId)
        return {success}
    }

    @Post(":provider")
    @Header("Cache-Control", "private, no-store")
    async connect(
        @Param("guildId") guildId: string,
        @Param("provider") provider: string,
        @Body() body: unknown,
        @Req() req: GuildRequest
    ): Promise<{url: string}> {
        const session = req.session
        if (provider !== "spotify" && provider !== "twitch") throw new BadRequestException("Unbekannter Anbieter.")
        if (!body || typeof body !== "object" || Array.isArray(body))
            throw new BadRequestException("Ungültige Einstellungen.")
        const data = body as Record<string, unknown>
        for (const key of ["clientId", "clientSecret"]) {
            if (data[key] !== undefined && typeof data[key] !== "string")
                throw new BadRequestException("Ungültige Spotify-Zugangsdaten.")
        }
        const options = await this.authorizationOptions(provider, guildId, data)
        const flow = await this.flow.begin({
            ...options,
            userId: session.userId,
            sessionId: session.id,
            returnTo: `${frontendUrl()}/dashboard/${guildId}`
        })
        return {url: flow.url}
    }

    private async authorizationOptions(
        provider: string,
        guildId: string,
        data: Record<string, unknown>
    ): Promise<Omit<AuthFlowOptions, "userId">> {
        if (provider === "spotify") {
            return this.spotifyAuth.createAuthorizationOptions(guildId, data.clientId, data.clientSecret)
        }
        return this.twitchAuth.createAuthorizationOptions(guildId)
    }
}
