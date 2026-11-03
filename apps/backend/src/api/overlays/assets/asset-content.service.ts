import {Injectable} from "@nestjs/common"
import type {Request, Response} from "express"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import {OverlayAssetsService} from "../../../features/overlays/assets/overlay-assets.service"
import {mediaRange} from "./media-range"
import type {AssetFile} from "../../../features/overlays/assets/models/asset-file"

@Injectable()
export class AssetContentService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly assets: OverlayAssetsService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("OverlayAssets")
    }

    async privateContent(guildId: string, assetId: string, request: Request, response: Response): Promise<void> {
        const file = await this.assets.privateFile(guildId, assetId)
        this.send(file, request, response)
    }

    async publicContent(
        overlayId: string,
        assetId: string,
        signature: string,
        request: Request,
        response: Response
    ): Promise<void> {
        const file = await this.assets.publicFile(overlayId, assetId, signature)
        this.send(file, request, response)
    }

    private send(file: AssetFile, req: Request, res: Response): void {
        res.set({
            "Content-Type": file.mimeType,
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Accept-Ranges": "bytes",
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
        })
        const range = req.headers.range ? mediaRange(req.headers.range, file.sizeBytes) : null
        if (req.headers.range && !range) {
            res.status(416).set("Content-Range", `bytes */${file.sizeBytes}`).end()
            return
        }
        const start = range?.start ?? 0
        const end = range?.end ?? file.sizeBytes - 1
        res.status(range ? 206 : 200).set("Content-Length", String(end - start + 1))
        if (range) res.set("Content-Range", `bytes ${start}-${end}/${file.sizeBytes}`)
        const stream = this.assets.read(file, range ?? undefined)
        stream.once("error", (cause) => {
            this.logger.warn(
                `Overlay asset read failed guild=${file.guildId} asset=${file.assetId} stage=read ${errorDetails(cause)}`
            )
            res.destroy()
        })
        res.once("close", () => stream.destroy())
        stream.pipe(res)
    }
}
