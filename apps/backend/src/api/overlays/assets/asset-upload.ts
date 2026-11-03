import {BadRequestException} from "@nestjs/common"
import type {Request} from "express"
import type {AssetUploadInput} from "../../../features/overlays/assets/dto/asset-upload-input"

export function readAssetUpload(request: Request): AssetUploadInput {
    const length = Number(request.headers["content-length"])
    const mimeType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase()
    let fileName: string
    try {
        fileName = decodeURIComponent(String(request.headers["x-file-name"] || "Upload"))
    } catch {
        request.resume()
        throw new BadRequestException("Ungültiger Dateiname.")
    }
    return {
        stream: request,
        declaredSizeBytes: Number.isFinite(length) ? length : undefined,
        mimeType: mimeType || "application/octet-stream",
        fileName
    }
}
