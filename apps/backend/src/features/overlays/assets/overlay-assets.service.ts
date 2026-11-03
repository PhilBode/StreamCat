import {type AssetRecord, AssetRepository, OverlayRepository, type StoredOverlay} from "@streamcat/db"
import type {AssetUploadInput} from "./dto/asset-upload-input"
import type {AssetFile} from "./models/asset-file"
import {
    ConflictException,
    BadRequestException,
    HttpException,
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    NotFoundException,
    PayloadTooLargeException,
    ServiceUnavailableException
} from "@nestjs/common"
import {createHmac, randomBytes, timingSafeEqual} from "node:crypto"
import type {Readable} from "node:stream"
import {AssetStorage} from "./storage/asset-storage"
import {BotLoggerService, errorDetails, requireEnv, type ModuleLogger} from "@streamcat/core"
import {isMediaWidget, type OverlayAsset, type OverlayLayout} from "@streamcat/interfaces"
import {GUILD_ASSET_QUOTA_BYTES, MAX_ASSET_BYTES, mediaFormat} from "./media-format"

const MAX_CONCURRENT_UPLOADS = 4

@Injectable()
export class OverlayAssetsService implements OnModuleInit, OnModuleDestroy {
    private cleanupTimer?: ReturnType<typeof setInterval>
    private readonly logger: ModuleLogger
    private cleanupRunning = false
    private readonly uploadingGuilds = new Set<string>()

    constructor(
        private readonly repository: AssetRepository,
        logger: BotLoggerService,
        private readonly overlays: OverlayRepository,
        private readonly storage: AssetStorage
    ) {
        this.logger = logger.forModule("OverlayAssets")
    }

    onModuleInit(): void {
        void this.cleanupOrphans()
        this.cleanupTimer = setInterval(() => void this.cleanupOrphans(), 60 * 60_000)
        this.cleanupTimer.unref()
    }

    onModuleDestroy(): void {
        clearInterval(this.cleanupTimer)
    }

    private async cleanupOrphans(): Promise<void> {
        if (this.cleanupRunning) return
        this.cleanupRunning = true
        try {
            const storedKeys = new Set(await this.repository.findStorageKeys())
            const cutoff = Date.now() - 60 * 60_000
            for await (const object of this.storage.list()) {
                if (!/^[a-f0-9]{64}$/.test(object.storageKey) || storedKeys.has(object.storageKey)) continue
                // Metadata commits after the upload; recent objects may still be in use.
                if (object.lastModified.getTime() > cutoff) continue
                await this.storage.remove(object.storageKey)
                this.logger.info("Removed an orphaned overlay asset")
            }
        } catch (error) {
            this.logger.warn(`Overlay asset cleanup failed ${errorDetails(error)}`)
        } finally {
            this.cleanupRunning = false
        }
    }

    async list(guildId: string): Promise<OverlayAsset[]> {
        return (await this.repository.findManyByGuildId(guildId)).map((asset) => this.toOverlayAsset(asset))
    }

    async upload(guildId: string, upload: AssetUploadInput): Promise<OverlayAsset> {
        if (
            upload.declaredSizeBytes !== undefined &&
            (!Number.isSafeInteger(upload.declaredSizeBytes) || upload.declaredSizeBytes < 1)
        ) {
            upload.stream.resume()
            throw new BadRequestException("Ungültige Dateigröße.")
        }
        if (upload.declaredSizeBytes !== undefined && upload.declaredSizeBytes > MAX_ASSET_BYTES) {
            upload.stream.resume()
            throw new PayloadTooLargeException("Ein Medium darf maximal 100 MiB groß sein.")
        }
        if (this.uploadingGuilds.has(guildId) || this.uploadingGuilds.size >= MAX_CONCURRENT_UPLOADS) {
            upload.stream.resume()
            throw new HttpException("Es laufen bereits Uploads. Bitte gleich erneut versuchen.", 429)
        }
        // One upload per guild keeps its remaining quota reserved until persistence completes.
        this.uploadingGuilds.add(guildId)
        const storageKey = randomBytes(32).toString("hex")
        let size = 0
        let uploadLimit = MAX_ASSET_BYTES
        let header = Buffer.alloc(0)
        let stage: "quota" | "write" | "validate" | "persist" = "quota"
        async function* readChunks(): AsyncIterable<Buffer> {
            // Do not destroy the HTTP request when validation stops reading early.
            for await (const value of upload.stream.iterator({destroyOnReturn: false})) {
                const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
                size += chunk.length
                if (size > MAX_ASSET_BYTES)
                    throw new PayloadTooLargeException("Ein Medium darf maximal 100 MiB groß sein.")
                if (size > uploadLimit)
                    throw new PayloadTooLargeException("Die Datei überschreitet die verfügbare Speicherkapazität.")
                if (header.length < 4096) header = Buffer.concat([header, chunk.subarray(0, 4096 - header.length)])
                yield chunk
            }
        }
        try {
            const usedBytes = await this.repository.storageUsageBytes(guildId)
            const availableBytes = Number(GUILD_ASSET_QUOTA_BYTES - usedBytes)
            if (
                availableBytes <= 0 ||
                (upload.declaredSizeBytes !== undefined && upload.declaredSizeBytes > availableBytes)
            ) {
                throw new PayloadTooLargeException("Der Medienspeicher für diesen Server ist auf 500 MiB begrenzt.")
            }
            uploadLimit = Math.min(MAX_ASSET_BYTES, availableBytes, upload.declaredSizeBytes ?? MAX_ASSET_BYTES)
            stage = "write"
            await this.storage.write(storageKey, readChunks())
            stage = "validate"
            const format = mediaFormat(header, size, upload.mimeType)
            const fileName =
                upload.fileName
                    .replace(/\\/g, "/")
                    .split("/")
                    .pop()!
                    // eslint-disable-next-line no-control-regex -- Strip control characters from uploaded filenames.
                    .replace(/[\u0000-\u001f\u007f]/g, "")
                    .trim()
                    .slice(0, 200) || "Upload"
            stage = "persist"
            const asset = await this.repository.createWithinQuota(
                {guildId, storageKey, ...format, fileName, sizeBytes: BigInt(size)},
                GUILD_ASSET_QUOTA_BYTES
            )
            if (!asset)
                throw new PayloadTooLargeException("Der Medienspeicher für diesen Server ist auf 500 MiB begrenzt.")
            this.logger.info(
                `Overlay asset uploaded guild=${guildId} asset=${asset.id} kind=${asset.kind} bytes=${size}`
            )
            return this.toOverlayAsset(asset)
        } catch (cause) {
            if (stage !== "quota") {
                try {
                    await this.storage.remove(storageKey)
                } catch (cleanupError) {
                    this.logger.warn(
                        `Overlay asset upload cleanup deferred guild=${guildId} ${errorDetails(cleanupError)}`
                    )
                }
            }
            upload.stream.resume()
            if (cause instanceof HttpException) throw cause
            this.logger.warn(
                `Overlay asset upload failed guild=${guildId} bytes=${size} stage=${stage} ${errorDetails(cause)}`
            )
            throw new ServiceUnavailableException(
                "Das Medium konnte nicht gespeichert werden. Bitte versuche es erneut."
            )
        } finally {
            this.uploadingGuilds.delete(guildId)
        }
    }

    async remove(guildId: string, assetId: string): Promise<void> {
        const result = await this.repository.deleteIfUnused(guildId, assetId)
        if (result.status === "not-found") throw new NotFoundException("Medium nicht gefunden.")
        if (result.status === "in-use")
            throw new ConflictException(
                "Das Medium wird noch in einer gespeicherten Szene verwendet. Entferne es dort und speichere die Szene zuerst."
            )
        if (/^[a-f0-9]{64}$/.test(result.asset.storageKey)) {
            try {
                await this.storage.remove(result.asset.storageKey)
            } catch (cause) {
                // Metadata revokes access immediately; orphan cleanup retries object removal.
                this.logger.warn(
                    `Overlay asset removal deferred guild=${guildId} asset=${assetId} ${errorDetails(cause)}`
                )
            }
        }
        this.logger.info(`Overlay asset deleted guild=${guildId} asset=${assetId}`)
    }

    async referenced(guildId: string, layout: OverlayLayout, overlay: StoredOverlay): Promise<OverlayAsset[]> {
        const ids = layout.widgets.filter(isMediaWidget).map((widget) => widget.params.assetId!)
        return (await this.repository.findReferenced(guildId, [...new Set(ids)])).map((asset) =>
            this.toOverlayAsset(asset, overlay)
        )
    }

    async privateFile(guildId: string, assetId: string): Promise<AssetFile> {
        const asset = await this.repository.findByIdAndGuildId(assetId, guildId)
        if (!asset) throw new NotFoundException("Medium nicht gefunden.")
        return this.storedFile(asset)
    }

    async publicFile(overlayId: string, assetId: string, signature: string): Promise<AssetFile> {
        if (
            !/^[a-zA-Z0-9_-]{1,100}$/.test(overlayId) ||
            !/^[a-zA-Z0-9_-]{1,100}$/.test(assetId) ||
            !/^[a-f0-9]{64}$/.test(signature)
        )
            throw new NotFoundException("Medium nicht gefunden.")
        let overlay: StoredOverlay | null
        let asset: AssetRecord | null
        try {
            overlay = await this.overlays.findById(overlayId)
            asset = overlay ? await this.repository.findByIdAndGuildId(assetId, overlay.guildId) : null
        } catch {
            throw new ServiceUnavailableException("Medium momentan nicht verfügbar.")
        }
        if (!overlay || !asset) throw new NotFoundException("Medium nicht gefunden.")
        const isReferenced = overlay.widgets.some(
            (widget) => widget.type === asset.kind && (widget.params as {assetId?: string} | null)?.assetId === asset.id
        )
        if (!isReferenced) throw new NotFoundException("Medium nicht gefunden.")
        const hasValidSignature = timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(this.signature(overlay, asset.id), "hex")
        )
        if (!hasValidSignature) throw new NotFoundException("Medium nicht gefunden.")
        return this.storedFile(asset)
    }

    private async storedFile(asset: AssetRecord): Promise<AssetFile> {
        if (!/^[a-f0-9]{64}$/.test(asset.storageKey)) throw new NotFoundException("Medium nicht gefunden.")
        let object: {sizeBytes: number} | null
        try {
            object = await this.storage.stat(asset.storageKey)
        } catch (cause) {
            this.logger.warn(
                `Overlay asset unavailable guild=${asset.guildId} asset=${asset.id} ${errorDetails(cause)}`
            )
            throw new ServiceUnavailableException("Medium momentan nicht verfügbar.")
        }
        if (!object) {
            this.logger.warn(`Overlay asset missing from storage guild=${asset.guildId} asset=${asset.id}`)
            throw new NotFoundException("Medium nicht gefunden.")
        }
        return {
            assetId: asset.id,
            guildId: asset.guildId,
            storageKey: asset.storageKey,
            sizeBytes: object.sizeBytes,
            fileName: asset.fileName || "Upload",
            mimeType: asset.mimeType || "application/octet-stream"
        }
    }

    read(file: AssetFile, range?: {start: number; end: number}): Readable {
        return this.storage.read(file.storageKey, range)
    }

    private signature(overlay: StoredOverlay, assetId: string): string {
        return createHmac("sha256", requireEnv("AUTH_SECRET"))
            .update(`overlay-asset:v1:${overlay.id}:${overlay.tokenHash}:${assetId}`)
            .digest("hex")
    }

    private toOverlayAsset(asset: AssetRecord, overlay?: StoredOverlay): OverlayAsset {
        return {
            id: asset.id,
            kind: asset.kind,
            fileName: asset.fileName || "Upload",
            mimeType: asset.mimeType || "application/octet-stream",
            sizeBytes: Number(asset.sizeBytes ?? 0n),
            url: overlay
                ? `/api/backend/overlays/assets/${overlay.id}/${asset.id}/${this.signature(overlay, asset.id)}`
                : `/api/backend/dashboard/guilds/${encodeURIComponent(asset.guildId)}/overlay/assets/${asset.id}/content`
        }
    }
}
