import type {WidgetType} from "./overlay"
import type {SpotifyPlaybackState} from "../spotify/song-details"
import type {WidgetDesignId} from "./widget-designs"

// Includes the two Intermission frames that were previously fixed scene elements.
export const MAX_OVERLAY_WIDGETS = 22
export const OVERLAY_WIDTH = 1920
export const OVERLAY_HEIGHT = 1080
export const MIN_WIDGET_WIDTH = 120
export const MIN_WIDGET_HEIGHT = 64
export const MAX_OVERLAY_GUIDES = 20

export type OverlayTheme = "default" | "autumn" | "winter"
export type OverlayScene = "intermission" | "starting_soon" | "stream_ending" | "widgets"
export type OverlayFont = "tiny5" | "jersey10"
export type EditorWidgetType = WidgetType

export type WidgetGeometry = {
    id: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number

    label?: string

    hidden?: boolean
}

export type WidgetAppearance = {
    design: WidgetDesignId
    color: string
    backgroundColor: string
    designColors?: Record<`--${string}`, string>
}

export type SpotifyWidgetParams = WidgetAppearance & {
    spectralizer?: boolean
    spectrumMode?: "audio" | "simulated"
    audioDeviceName?: string
}

export type ChatWidgetParams = WidgetAppearance & {
    chatChannel?: string
    chatFont?: number | string
    chatSize?: number
    chatFade?: number
    chatAnimate?: boolean
    chatBots?: boolean
    chatHideCommands?: boolean
    chatHideBadges?: boolean
    title?: string
}

export type WindowWidgetParams = WidgetAppearance & {
    title?: string
    lockContentAspectRatio?: boolean
    greenScreen?: boolean
}

export type MediaWidgetParams = WidgetAppearance & {
    assetId: string
    fit?: "contain" | "cover"
}

export type EditorWidget = WidgetGeometry &
    (
        | {type: "SPOTIFY_NOW_PLAYING"; params: SpotifyWidgetParams}
        | {type: "TWITCH_CHAT"; params: ChatWidgetParams}
        | {type: "WINDOW"; params: WindowWidgetParams}
        | {type: "IMAGE" | "VIDEO"; params: MediaWidgetParams}
    )

export function withWidgetColors<T extends EditorWidget>(widget: T, colors: Partial<WidgetAppearance>): T {
    return {...widget, params: {...widget.params, ...colors}}
}

export function isMediaWidget(widget: EditorWidget): widget is Extract<EditorWidget, {type: "IMAGE" | "VIDEO"}> {
    return widget.type === "IMAGE" || widget.type === "VIDEO"
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
    socials?: {twitch?: string; twitter?: string; discord?: string}
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
    kind: "IMAGE" | "VIDEO"
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
