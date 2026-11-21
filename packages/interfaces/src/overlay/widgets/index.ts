import {backgroundSpec} from "./background"
import {clockSpec} from "./clock"
import {countdownSpec} from "./countdown"
import {mediaSpec} from "./media"
import {progressSpec} from "./progress"
import {shapeSpec} from "./shape"
import {socialsSpec} from "./socials"
import {spotifySpec} from "./spotify"
import {textSpec} from "./text"
import {tickerSpec} from "./ticker"
import {twitchChatSpec} from "./twitch-chat"
import {windowSpec} from "./window"
import type {WidgetGeometry, WidgetSpec} from "./types"

export const WIDGET_SPECS = {
    SPOTIFY_NOW_PLAYING: spotifySpec,
    TWITCH_CHAT: twitchChatSpec,
    WINDOW: windowSpec,
    MEDIA: mediaSpec,
    BACKGROUND: backgroundSpec,
    TEXT: textSpec,
    CLOCK: clockSpec,
    SOCIALS: socialsSpec,
    SHAPE: shapeSpec,
    COUNTDOWN: countdownSpec,
    TICKER: tickerSpec,
    PROGRESS: progressSpec
} satisfies Record<string, WidgetSpec<unknown>>

export type WidgetType = keyof typeof WIDGET_SPECS
export type WidgetParamsByType = {
    [K in WidgetType]: (typeof WIDGET_SPECS)[K] extends WidgetSpec<infer P> ? P : never
}
export type EditorWidget = WidgetGeometry &
    {
        [K in WidgetType]: {type: K; params: WidgetParamsByType[K]}
    }[WidgetType]

export function isWidgetType(value: unknown): value is WidgetType {
    return typeof value === "string" && Object.hasOwn(WIDGET_SPECS, value)
}

export * from "./types"
export * from "./appearance"
export * from "./spotify"
export * from "./twitch-chat"
export * from "./window"
export * from "./media"
export * from "./background"
export * from "./text"
export * from "./clock"
export * from "./socials"
export * from "./shape"
export * from "./countdown"
export * from "./ticker"
export * from "./progress"
