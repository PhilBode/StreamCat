import type {WidgetType} from "@streamcat/interfaces"
import type {WidgetModule} from "./types"
import {backgroundModule} from "./background"
import {clockModule} from "./clock"
import {countdownModule} from "./countdown"
import {mediaModule} from "./media"
import {progressModule} from "./progress"
import {shapeModule} from "./shape"
import {socialsModule} from "./socials"
import {spotifyModule} from "./spotify"
import {textModule} from "./text"
import {tickerModule} from "./ticker"
import {twitchChatModule} from "./twitch-chat"
import {windowModule} from "./window"

export const WIDGET_MODULES: Record<WidgetType, WidgetModule> = {
    SPOTIFY_NOW_PLAYING: spotifyModule,
    TWITCH_CHAT: twitchChatModule,
    WINDOW: windowModule,
    MEDIA: mediaModule,
    BACKGROUND: backgroundModule,
    TEXT: textModule,
    CLOCK: clockModule,
    SOCIALS: socialsModule,
    SHAPE: shapeModule,
    COUNTDOWN: countdownModule,
    TICKER: tickerModule,
    PROGRESS: progressModule
}

export const WIDGET_CATALOG_TYPES = Object.values(WIDGET_MODULES)
    .filter((module) => module.addable)
    .map((module) => module.type)

export type AddableWidgetType = WidgetType

export function widgetModule(type: WidgetType): WidgetModule {
    return WIDGET_MODULES[type]
}
