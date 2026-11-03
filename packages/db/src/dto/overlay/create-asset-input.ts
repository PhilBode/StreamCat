import type {AssetKind} from "@streamcat/interfaces"

export type CreateAssetInput = {
    guildId: string
    kind: AssetKind
    storageKey: string
    fileName: string | null
    mimeType: string | null
    sizeBytes: bigint | null
}
