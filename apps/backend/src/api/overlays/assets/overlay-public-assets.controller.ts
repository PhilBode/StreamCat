import {Controller, Get, Header, Param, Req, Res} from "@nestjs/common"
import type {Request, Response} from "express"
import {AssetContentService} from "./asset-content.service"

@Controller("overlays/assets")
export class OverlayPublicAssetsController {
    constructor(private readonly assetContent: AssetContentService) {}

    @Get(":overlayId/:assetId/:signature")
    @Header("Cache-Control", "private, no-store")
    @Header("Referrer-Policy", "no-referrer")
    content(
        @Param("overlayId") overlayId: string,
        @Param("assetId") assetId: string,
        @Param("signature") signature: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        return this.assetContent.publicContent(overlayId, assetId, signature, req, res)
    }
}
