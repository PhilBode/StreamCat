import type {AssetKind} from "./overlay"
import type {SpotifyPlaybackState} from "../spotify/song-details"
import type {EditorWidget, WidgetAppearance} from "./widgets"
import {OVERLAY_HEIGHT, OVERLAY_WIDTH} from "./constants"

export type OverlayTheme = "default" | "autumn" | "winter"
export type OverlayScene = "intermission" | "starting_soon" | "stream_ending" | "widgets"
export type OverlayFont = "tiny5" | "jersey10"

export function withWidgetColors<T extends EditorWidget>(widget: T, colors: Partial<WidgetAppearance>): T {
    return {...widget, params: {...widget.params, ...colors}}
}

export function isMediaWidget(widget: EditorWidget): widget is Extract<EditorWidget, {type: "MEDIA"}> {
    return widget.type === "MEDIA"
}

export interface OverlayLayout {
    width: typeof OVERLAY_WIDTH
    height: typeof OVERLAY_HEIGHT
    theme: OverlayTheme

    themeColors?: {
        primary?: string

        secondary?: string

        surface?: string

        window?: string

        text?: string
    }
    scene?: OverlayScene
    font?: OverlayFont
    guides?: {vertical: number[]; horizontal: number[]}
    widgets: EditorWidget[]
}

export interface GuildOverlay {
    id: string
    guildId: string
    name: string
    layout: OverlayLayout
}

export type OverlayPlayback = SpotifyPlaybackState

export interface OverlaySnapshot {
    overlay: GuildOverlay
    playback: OverlayPlayback
    chat: OverlayChat
    assets: OverlayAsset[]
}

export interface OverlayAsset {
    id: string
    kind: AssetKind
    fileName: string
    mimeType: string
    sizeBytes: number
    url: string
}

export interface OverlayChat {
    channel: string | null
    url: string | null
    previewUrl?: string | null
}

export interface OverlayLink {
    browserSourceUrl: string
}
