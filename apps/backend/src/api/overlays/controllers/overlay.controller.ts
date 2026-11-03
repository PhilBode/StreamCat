import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"
import {Body, Controller, UseGuards, Get, Header, Param, Post} from "@nestjs/common"
import {OverlayService} from "../../../features/overlays/services/overlay.service"
import {OverlayPlaybackService} from "../../../features/overlays/services/overlay-playback.service"

@Controller("dashboard/guilds/:guildId/overlay")
@UseGuards(SessionGuard, GuildAdminGuard)
export class OverlayController {
    constructor(
        private readonly overlays: OverlayService,
        private readonly playback: OverlayPlaybackService
    ) {}

    @Get("scenes")
    @Header("Cache-Control", "private, no-store")
    async scenes(@Param("guildId") guildId: string) {
        return this.overlays.scenes(guildId)
    }

    @Post("scenes")
    @Header("Cache-Control", "private, no-store")
    async createScene(@Param("guildId") guildId: string, @Body() body: unknown) {
        return this.overlays.createScene(guildId, body)
    }

    @Get("scenes/:overlayId")
    @Header("Cache-Control", "private, no-store")
    async scene(@Param("guildId") guildId: string, @Param("overlayId") overlayId: string) {
        return this.overlays.scene(guildId, overlayId)
    }

    @Post("scenes/:overlayId/layout")
    @Header("Cache-Control", "private, no-store")
    async saveScene(@Param("guildId") guildId: string, @Param("overlayId") overlayId: string, @Body() body: unknown) {
        return this.overlays.saveScene(guildId, overlayId, body)
    }

    @Post("scenes/:overlayId/rotate")
    @Header("Cache-Control", "private, no-store")
    async rotateScene(@Param("guildId") guildId: string, @Param("overlayId") overlayId: string) {
        return this.overlays.rotateScene(guildId, overlayId)
    }

    @Post("scenes/:overlayId/name")
    @Header("Cache-Control", "private, no-store")
    async renameScene(@Param("guildId") guildId: string, @Param("overlayId") overlayId: string, @Body() body: unknown) {
        return this.overlays.renameScene(guildId, overlayId, body)
    }

    @Get("preview")
    @Header("Cache-Control", "private, no-store")
    async preview(@Param("guildId") guildId: string) {
        const [playback, chat] = await Promise.all([this.playback.get(guildId), this.overlays.chat(guildId)])
        return {playback, chat}
    }
}
