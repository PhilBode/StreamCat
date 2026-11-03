import type {WidgetType} from "@streamcat/interfaces"
import type {JsonValue} from "./json-value"

export interface OverlayWidgetRecord {
    id: string
    overlayId: string
    type: WidgetType
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    params: JsonValue
    createdAt: Date
    updatedAt: Date
}
