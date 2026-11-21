import {expect, test} from "bun:test"
import {randomBytes, randomUUID} from "node:crypto"
import {ConflictException, NotFoundException} from "@nestjs/common"
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../prisma/generated/client"
import type {PrismaService} from "../src/prisma.service"
import {AssetRepository} from "../src/repositories/overlay/asset.repository"
import {OverlayRepository} from "../src/repositories/overlay/overlay.repository"
import {overlayPreset, type OverlayLayout} from "@streamcat/interfaces"
import type {BotLoggerService} from "@streamcat/core"
import type {AssetStorage} from "../../../apps/backend/src/features/overlays/assets/storage/asset-storage"
import {OverlayAssetsService} from "../../../apps/backend/src/features/overlays/assets/overlay-assets.service"

const databaseUrl = process.env.STREAMCAT_TEST_DATABASE_URL
const databaseTest = databaseUrl ? test : test.skip

databaseTest("asset deletion preserves used media and serializes with layout saves", async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith("/streamcat_auth_test"))
        throw new Error("Use a disposable streamcat_auth_test database")
    const db = new PrismaClient({adapter: new PrismaPg({connectionString: databaseUrl})})
    const assets = new AssetRepository(db as unknown as PrismaService)
    const overlays = new OverlayRepository(db as unknown as PrismaService)
    const storedKeys = new Set<string>()
    const storage = {
        remove: async (key: string) => {
            storedKeys.delete(key)
        }
    } as AssetStorage
    const logger = {forModule: () => ({info: () => {}, warn: () => {}})} as unknown as BotLoggerService
    const service = new OverlayAssetsService(assets, logger, overlays, storage)
    const guildId = randomUUID(),
        foreignGuildId = randomUUID()
    const storageKey = randomBytes(32).toString("hex")
    try {
        await db.guildConfig.createMany({
            data: [
                {guildId, logChannel: "test"},
                {guildId: foreignGuildId, logChannel: "test"}
            ]
        })
        const asset = await db.asset.create({
            data: {guildId, kind: "IMAGE", storageKey, fileName: "image.png", sizeBytes: 4n}
        })
        storedKeys.add(storageKey)
        await expect(service.remove(foreignGuildId, asset.id)).rejects.toBeInstanceOf(NotFoundException)
        expect(await db.asset.count({where: {id: asset.id}})).toBe(1)
        const empty = overlayPreset("widgets", [randomUUID(), randomUUID()])
        const scene = await overlays.createScene(guildId, "Test", randomBytes(32).toString("hex"), empty)
        if (!scene) throw new Error("Scene creation failed")
        const layout: OverlayLayout = {
            ...empty,
            widgets: [
                {
                    id: randomUUID(),
                    type: "MEDIA",
                    x: 0,
                    y: 0,
                    width: 300,
                    height: 200,
                    zIndex: 0,
                    params: {assetId: asset.id, color: "#ffffff", backgroundColor: "transparent"}
                }
            ]
        }
        expect(await overlays.saveLayout(guildId, scene.id, layout)).not.toBeNull()
        await expect(service.remove(guildId, asset.id)).rejects.toBeInstanceOf(ConflictException)
        expect(storedKeys.has(storageKey)).toBe(true)
        await overlays.saveLayout(guildId, scene.id, empty)
        await db.overlay.update({where: {id: scene.id}, data: {backgroundAssetId: asset.id}})
        await expect(service.remove(guildId, asset.id)).rejects.toBeInstanceOf(ConflictException)
        await db.overlay.update({where: {id: scene.id}, data: {backgroundAssetId: null}})
        await service.remove(guildId, asset.id)
        expect(await db.asset.findUnique({where: {id: asset.id}})).toBeNull()
        expect(storedKeys.has(storageKey)).toBe(false)
        expect(await overlays.saveLayout(guildId, scene.id, layout)).toBeNull()
        const raceAsset = await assets.createWithinQuota(
            {
                guildId,
                kind: "IMAGE",
                storageKey: randomBytes(32).toString("hex"),
                fileName: "race.png",
                mimeType: "image/png",
                sizeBytes: 4n
            },
            4n
        )
        if (!raceAsset) throw new Error("Deleted asset did not release quota")
        const raceLayout: OverlayLayout = {
            ...layout,
            widgets: [
                {
                    ...layout.widgets[0],
                    type: "MEDIA",
                    params: {assetId: raceAsset.id, color: "#ffffff", backgroundColor: "transparent"}
                }
            ]
        }
        // Either save wins and deletion is blocked, or deletion wins and save is rejected.
        const [saved, removed] = await Promise.all([
            overlays.saveLayout(guildId, scene.id, raceLayout),
            assets.deleteIfUnused(guildId, raceAsset.id)
        ])
        expect(saved !== null).toBe(removed.status === "in-use")
        expect(removed.status).not.toBe("not-found")
        expect(await db.asset.count({where: {id: raceAsset.id}})).toBe(saved ? 1 : 0)
    } finally {
        await db.guildConfig.deleteMany({where: {guildId: {in: [guildId, foreignGuildId]}}})
        await db.$disconnect()
    }
})
