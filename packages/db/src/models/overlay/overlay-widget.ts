import type {JsonValue} from "./json-value"

export interface OverlayWidgetRecord {
    id: string
    overlayId: string
    type: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    params: JsonValue
    label: string | null
    hidden: boolean
    createdAt: Date
    updatedAt: Date
}
