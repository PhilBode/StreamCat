import type {ComponentType} from "react"
import type {EditorWidget, EditorWidgetType, OverlayAsset, OverlayChat, OverlayPlayback} from "@streamcat/interfaces"

export type WidgetRenderProps = {
    widget: EditorWidget
    playback: OverlayPlayback
    chat: OverlayChat
    assets: OverlayAsset[]
    interactive: boolean
    audioEnabled: boolean
    title: string
}

export type WidgetSettingsProps = {
    widget: EditorWidget
    assets: OverlayAsset[]
    onChange: (widget: EditorWidget) => void
    onSetBackground: () => void
    previewAudio: boolean
    onPreviewAudioChange?: (enabled: boolean) => void
}

export type WidgetColorControl = {
    key: "color" | "backgroundColor" | `--${string}`
    label: string
}

export type WidgetDesign = {
    id: string
    label: string
    color: string
    backgroundColor: string
    tokens?: Record<`--${string}`, string>
    colorControls: readonly WidgetColorControl[]
    settings?: ComponentType<WidgetSettingsProps>
    component: ComponentType<WidgetRenderProps>
}

export type WidgetModule = {
    type: EditorWidgetType
    label: string
    width: number
    height: number
    defaultDesign: string
    designs: Record<string, WidgetDesign>
    settings: ComponentType<WidgetSettingsProps>
}
