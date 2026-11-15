import type {EditorWidgetType} from "@streamcat/interfaces"
import type {WidgetModule} from "./types"
import {imageModule, videoModule} from "./media"
import {spotifyModule} from "./spotify"
import {twitchChatModule} from "./twitch-chat"
import {windowModule} from "./window"

export const WIDGET_MODULES: Record<EditorWidgetType, WidgetModule> = {
    SPOTIFY_NOW_PLAYING: spotifyModule,
    TWITCH_CHAT: twitchChatModule,
    WINDOW: windowModule,
    IMAGE: imageModule,
    VIDEO: videoModule
}

export const WIDGET_CATALOG_TYPES = ["SPOTIFY_NOW_PLAYING", "TWITCH_CHAT", "WINDOW"] as const
export type AddableWidgetType = (typeof WIDGET_CATALOG_TYPES)[number]

export function widgetModule(type: EditorWidgetType): WidgetModule {
    return WIDGET_MODULES[type]
}
