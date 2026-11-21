import "reflect-metadata"
import {afterEach, beforeEach, expect, test} from "bun:test"
import {createHmac} from "node:crypto"
import {Readable} from "node:stream"
import {OverlayAssetsService} from "../src/features/overlays/assets/overlay-assets.service"
import {GUILD_ASSET_QUOTA_BYTES} from "../src/features/overlays/assets/media-format"

const logger = {forModule: () => ({info() {}, warn() {}})}
const asset = {
    id: "asset-audit",
    guildId: "guild-audit",
    kind: "IMAGE",
    storageKey: "cd".repeat(32),
    mimeType: "image/png",
    fileName: "test.png",
    sizeBytes: 32n
}
const overlay = {
    id: "scene-audit",
    guildId: asset.guildId,
    tokenHash: "ab".repeat(32),
    widgets: [{type: "MEDIA", params: {assetId: asset.id}}]
}
const previousSecret = process.env.AUTH_SECRET
beforeEach(() => {
    process.env.AUTH_SECRET = "test-only-installation-secret"
})
afterEach(() => {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = previousSecret
})

function upload() {
    const png = Buffer.alloc(32)
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png)
    return {stream: Readable.from([png]), mimeType: "image/png", fileName: "test.png", declaredSizeBytes: png.length}
}

test("asset signatures require the server secret and are bound to their scene and token rotation", async () => {
    const scene = {...overlay}
    const service = new OverlayAssetsService(
        {findReferenced: async () => [asset], findByIdAndGuildId: async () => asset} as never,
        logger as never,
        {findById: async (id: string) => ({...scene, id})} as never,
        {stat: async () => ({sizeBytes: 32})} as never
    )
    const layout = {widgets: scene.widgets} as never
    const [linked] = await service.referenced(asset.guildId, layout, scene as never)
    const signature = linked.url.split("/").at(-1)!
    expect((await service.publicFile(scene.id, asset.id, signature)).assetId).toBe(asset.id)
    const forged = createHmac("sha256", Buffer.from(scene.tokenHash, "hex")).update(asset.id).digest("hex")
    await expect(service.publicFile(scene.id, asset.id, forged)).rejects.toThrow("Medium nicht gefunden")
    await expect(service.publicFile("another-scene", asset.id, signature)).rejects.toThrow("Medium nicht gefunden")
    scene.tokenHash = "ef".repeat(32)
    await expect(service.publicFile(scene.id, asset.id, signature)).rejects.toThrow("Medium nicht gefunden")
})

test("full quota rejects before storage writes and releases the guild's upload slot on failure", async () => {
    let usedBytes = GUILD_ASSET_QUOTA_BYTES
    let writes = 0
    const service = new OverlayAssetsService(
        {storageUsageBytes: async () => usedBytes, createWithinQuota: async () => asset} as never,
        logger as never,
        {} as never,
        {
            write: async (_key: string, chunks: AsyncIterable<Buffer>) => {
                writes++
                for await (const chunk of chunks) {
                    expect(chunk.length).toBe(32)
                }
            },
            remove: async () => {}
        } as never
    )
    await expect(service.upload(asset.guildId, upload())).rejects.toMatchObject({status: 413})
    expect(writes).toBe(0)
    usedBytes = 0n
    expect((await service.upload(asset.guildId, upload())).id).toBe(asset.id)
    expect(writes).toBe(1)
})

test("uploads share a four-slot limit and reserve each guild until persistence finishes", async () => {
    let release!: () => void
    let started!: () => void
    const blocked = new Promise<void>((resolve) => {
        release = resolve
    })
    const allStarted = new Promise<void>((resolve) => {
        started = resolve
    })
    let writes = 0
    const service = new OverlayAssetsService(
        {storageUsageBytes: async () => 0n, createWithinQuota: async () => asset} as never,
        logger as never,
        {} as never,
        {
            write: async (_key: string, chunks: AsyncIterable<Buffer>) => {
                for await (const chunk of chunks) {
                    expect(chunk.length).toBe(32)
                }
                if (++writes === 4) started()
                await blocked
            },
            remove: async () => {}
        } as never
    )
    const pending = [0, 1, 2, 3].map((index) => service.upload(`guild-${index}`, upload()))
    try {
        await allStarted
        await expect(service.upload("guild-0", upload())).rejects.toMatchObject({status: 429})
        await expect(service.upload("guild-4", upload())).rejects.toMatchObject({status: 429})
        expect(writes).toBe(4)
    } finally {
        release()
        await Promise.all(pending)
    }
    expect((await service.upload("guild-4", upload())).id).toBe(asset.id)
})
