import {isMediaWidget, type EditorWidget, type OverlayAsset} from "@streamcat/interfaces"

export const WIDGET_DEFINITIONS = {
    SPOTIFY_NOW_PLAYING: {label: "Spotify", width: 640, height: 300},
    TWITCH_CHAT: {label: "Twitch-Chat", width: 440, height: 560},
    WINDOW: {label: "Fenster", width: 640, height: 300},
    IMAGE: {label: "Bild", width: 480, height: 270},
    VIDEO: {label: "Video", width: 480, height: 270}
} as const

export function widgetName(widget: EditorWidget, assets: OverlayAsset[] = []) {
    if (widget.type === "WINDOW")
        return widget.params.title && widget.params.title !== "Fenster" ? `Fenster · ${widget.params.title}` : "Fenster"
    const name = WIDGET_DEFINITIONS[widget.type].label
    const asset = isMediaWidget(widget) ? assets.find((item) => item.id === widget.params.assetId) : undefined
    return asset ? `${name} · ${asset.fileName}` : name
}
