import type {OverlayType} from "@streamcat/interfaces"
import type {JsonValue} from "./json-value"
import type {OverlayWidgetRecord} from "./overlay-widget"

export interface StoredOverlay {
    guildId: string
    id: string
    name: string
    tokenHash: string
    type: OverlayType
    backgroundAssetId: string | null
    settings: JsonValue | null
    customHtml: string | null
    customCss: string | null
    updatedAt: Date
    widgets: OverlayWidgetRecord[]
}
