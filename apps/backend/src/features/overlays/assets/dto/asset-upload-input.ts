import type {Readable} from "node:stream"

export interface AssetUploadInput {
    stream: Readable
    declaredSizeBytes?: number
    mimeType: string
    fileName: string
}
