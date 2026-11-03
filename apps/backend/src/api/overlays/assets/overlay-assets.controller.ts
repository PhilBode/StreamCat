import {AssetContentService} from "./asset-content.service"
import {readAssetUpload} from "./asset-upload"
import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"
import type {GuildRequest} from "../../auth/models/authenticated-request"
import {Controller, UseGuards, Delete, Get, Header, Param, Post, Req, Res} from "@nestjs/common"
import type {Response} from "express"
import {OverlayAssetsService} from "../../../features/overlays/assets/overlay-assets.service"

@Controller("dashboard/guilds/:guildId/overlay/assets")
@UseGuards(SessionGuard, GuildAdminGuard)
export class OverlayAssetsController {
    constructor(
        private readonly assets: OverlayAssetsService,
        private readonly assetContent: AssetContentService
    ) {}

    @Get()
    @Header("Cache-Control", "private, no-store")
    async list(@Param("guildId") guildId: string) {
        return this.assets.list(guildId)
    }

    @Post()
    @Header("Cache-Control", "private, no-store")
    async upload(@Param("guildId") guildId: string, @Req() req: GuildRequest) {
        return this.assets.upload(guildId, readAssetUpload(req))
    }

    @Delete(":assetId")
    @Header("Cache-Control", "private, no-store")
    async remove(@Param("guildId") guildId: string, @Param("assetId") assetId: string) {
        await this.assets.remove(guildId, assetId)
        return {success: true}
    }

    @Get(":assetId/content")
    async content(
        @Param("guildId") guildId: string,
        @Param("assetId") assetId: string,
        @Req() req: GuildRequest,
        @Res() res: Response
    ) {
        await this.assetContent.privateContent(guildId, assetId, req, res)
    }
}
