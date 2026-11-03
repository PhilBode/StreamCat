import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"
import {BadRequestException, Body, Controller, UseGuards, Get, Header, Param, Post} from "@nestjs/common"
import type {SongRequestReward, SongRequestSettings, SongRequestUpdate, SpotifyQueue} from "@streamcat/interfaces"
import {SongRequestService} from "../../../features/song-requests/song-request.service"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"

@Controller("dashboard/guilds/:guildId/song-requests")
@UseGuards(SessionGuard, GuildAdminGuard)
export class SongRequestsController {
    constructor(
        private readonly songRequests: SongRequestService,
        private readonly spotify: SpotifyService
    ) {}

    @Get("queue")
    @Header("Cache-Control", "private, no-store")
    queue(@Param("guildId") guildId: string): Promise<SpotifyQueue> {
        return this.spotify.getQueue(guildId)
    }

    @Get()
    @Header("Cache-Control", "private, no-store")
    async settings(@Param("guildId") guildId: string): Promise<SongRequestSettings> {
        return this.songRequests.getSettings(guildId)
    }

    @Get("rewards")
    @Header("Cache-Control", "private, no-store")
    async rewards(@Param("guildId") guildId: string): Promise<SongRequestReward[]> {
        return this.songRequests.getRewards(guildId)
    }

    @Post()
    @Header("Cache-Control", "private, no-store")
    async update(@Param("guildId") guildId: string, @Body() body: unknown): Promise<SongRequestSettings> {
        const fields = parseSongRequestUpdate(body)
        return this.songRequests.updateSettings(guildId, fields)
    }
}

function parseSongRequestUpdate(body: unknown): SongRequestUpdate {
    if (!body || typeof body !== "object" || Array.isArray(body))
        throw new BadRequestException("Ungültige Song-Request-Einstellungen.")
    const fields = body as Record<string, unknown>
    if (
        !Object.keys(fields).length ||
        Object.keys(fields).some((key) => !["enabled", "chatCommandEnabled", "rewardIds"].includes(key))
    ) {
        throw new BadRequestException("Ungültige Song-Request-Einstellungen.")
    }
    for (const key of ["enabled", "chatCommandEnabled"]) {
        if (fields[key] !== undefined && typeof fields[key] !== "boolean")
            throw new BadRequestException(`${key} muss ein boolescher Wert sein.`)
    }
    if (fields.rewardIds !== undefined) {
        const ids = fields.rewardIds
        if (!Array.isArray(ids) || ids.length > 50) {
            throw new BadRequestException("rewardIds muss eine Liste gültiger Belohnungs-IDs sein.")
        }
        const hasInvalidId = ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 100)
        if (hasInvalidId) throw new BadRequestException("rewardIds muss eine Liste gültiger Belohnungs-IDs sein.")
    }
    return fields as SongRequestUpdate
}
