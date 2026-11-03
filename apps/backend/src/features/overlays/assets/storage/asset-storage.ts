import type {Readable} from "node:stream"
import type {StoredAssetObject} from "../models/stored-asset-object"

export abstract class AssetStorage {
    abstract write(storageKey: string, chunks: AsyncIterable<Uint8Array>): Promise<void>
    abstract stat(storageKey: string): Promise<{sizeBytes: number} | null>
    abstract read(storageKey: string, range?: {start: number; end: number}): Readable
    abstract remove(storageKey: string): Promise<void>
    abstract list(): AsyncIterable<StoredAssetObject>
}
