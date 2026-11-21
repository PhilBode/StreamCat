import type {JsonValue} from "./json-value"
import type {OverlayWidgetRecord} from "./overlay-widget"

export interface StoredOverlay {
    guildId: string
    id: string
    name: string
    tokenHash: string
    browserToken: string | null
    backgroundAssetId: string | null
    settings: JsonValue | null
    updatedAt: Date
    widgets: OverlayWidgetRecord[]
}
