import {Injectable} from "@nestjs/common"
import {Readable} from "node:stream"
import {AssetStorage} from "../../features/overlays/assets/storage/asset-storage"
import type {StoredAssetObject} from "../../features/overlays/assets/models/stored-asset-object"
import {assetStorageClient} from "./asset-storage-client"

@Injectable()
export class S3AssetStorage extends AssetStorage {
    private readonly client = assetStorageClient()

    async write(storageKey: string, chunks: AsyncIterable<Uint8Array>): Promise<void> {
        const iterator = chunks[Symbol.asyncIterator]()
        const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
                const chunk = await iterator.next()
                if (chunk.done) controller.close()
                else controller.enqueue(chunk.value)
            },
            async cancel() {
                await iterator.return?.()
            }
        })
        // Response streaming aborts multipart uploads when the input fails.
        try {
            await this.client.file(storageKey).write(new Response(stream), {partSize: 5 * 1024 * 1024, queueSize: 1})
        } finally {
            await iterator.return?.()
        }
    }

    async stat(storageKey: string): Promise<{sizeBytes: number} | null> {
        try {
            const object = await this.client.stat(storageKey)
            return {sizeBytes: object.size}
        } catch (error) {
            if (error && typeof error === "object" && "code" in error && error.code === "NoSuchKey") return null
            throw error
        }
    }

    read(storageKey: string, range?: {start: number; end: number}): Readable {
        const object = this.client.file(storageKey)
        const content = range ? object.slice(range.start, range.end + 1) : object
        return Readable.from(content.stream())
    }

    remove(storageKey: string): Promise<void> {
        return this.client.delete(storageKey)
    }

    async *list(): AsyncIterable<StoredAssetObject> {
        let continuationToken: string | undefined
        do {
            const page = await this.client.list({continuationToken})
            for (const object of page.contents ?? []) {
                if (!object.lastModified) throw new Error("Storage returned an object without its modification time")
                const lastModified = new Date(object.lastModified)
                if (!Number.isFinite(lastModified.getTime()))
                    throw new Error("Storage returned an invalid modification time")
                yield {storageKey: object.key, lastModified}
            }
            continuationToken = page.isTruncated ? page.nextContinuationToken : undefined
            if (page.isTruncated && !continuationToken) throw new Error("Storage returned an incomplete object listing")
        } while (continuationToken)
    }
}
