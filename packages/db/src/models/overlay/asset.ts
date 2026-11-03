import type {AssetKind} from "@streamcat/interfaces"

export interface AssetRecord {
    id: string
    guildId: string
    kind: AssetKind
    storageKey: string
    fileName: string | null
    mimeType: string | null
    sizeBytes: bigint | null
    createdAt: Date
}
