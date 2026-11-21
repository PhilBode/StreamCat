import {WIDGET_SPECS, type EditorWidget, type WidgetAppearance, type WidgetType} from "./widgets"
import {type OverlayLayout, type OverlayScene, type OverlayTheme} from "./overlay-dashboard"
import {OVERLAY_COLOR_TEMPLATES, type OverlayColorTemplate} from "./color-templates"
import {OVERLAY_HEIGHT, OVERLAY_WIDTH} from "./constants"
import {windowHeight} from "./window-geometry"

const themeColors = (template: OverlayColorTemplate) => ({
    color: template.color,
    backgroundColor: template.backgroundColor,
    gradientStart: template.gradientStart,
    gradientEnd: template.gradientEnd
})

export const OVERLAY_THEME_COLORS: Record<
    OverlayTheme,
    {color: string; backgroundColor: string; gradientStart: string; gradientEnd: string}
> = {
    default: themeColors(OVERLAY_COLOR_TEMPLATES.standard),
    autumn: themeColors(OVERLAY_COLOR_TEMPLATES.autumn),
    winter: themeColors(OVERLAY_COLOR_TEMPLATES.winter)
}

const PRESET_DESIGNS: Record<WidgetType, string> = {
    SPOTIFY_NOW_PLAYING: "artwork",
    TWITCH_CHAT: "windowed",
    WINDOW: "windowed",
    MEDIA: "media",
    BACKGROUND: "animated",
    TEXT: "headline",
    CLOCK: "stacked",
    SOCIALS: "inline",
    SHAPE: "rect",
    COUNTDOWN: "stacked",
    TICKER: "marquee",
    PROGRESS: "bar"
}

const TRANSPARENT_WIDGETS = new Set<WidgetType>([
    "BACKGROUND",
    "TEXT",
    "CLOCK",
    "SOCIALS",
    "SHAPE",
    "COUNTDOWN",
    "TICKER",
    "PROGRESS"
])

function presetAppearance(theme: OverlayTheme, type: WidgetType): WidgetAppearance {
    const colors = OVERLAY_THEME_COLORS[theme]
    return {
        design: PRESET_DESIGNS[type],
        color: colors.color,
        backgroundColor: TRANSPARENT_WIDGETS.has(type) ? "transparent" : colors.backgroundColor
    }
}

function presetWidget(
    type: WidgetType,
    id: string,
    theme: OverlayTheme,
    geometry: {x: number; y: number; width: number; height: number; zIndex: number},
    overrides: Record<string, unknown> = {}
): EditorWidget {
    const spec = WIDGET_SPECS[type]
    const params = {
        ...spec.defaults(presetAppearance(theme, type)),
        ...overrides
    }
    return {id, type, ...geometry, params} as EditorWidget
}

export function overlayPreset(
    scene: OverlayScene,
    ids: [string, string],
    theme: OverlayTheme = "default"
): OverlayLayout {
    const intermission = scene === "intermission"
    const widgets: EditorWidget[] = []
    if (scene !== "widgets") {
        widgets.push(
            presetWidget("BACKGROUND", `${ids[0]}-background`, theme, {
                x: 0,
                y: 0,
                width: OVERLAY_WIDTH,
                height: OVERLAY_HEIGHT,
                zIndex: 0
            }),
            presetWidget(
                "TWITCH_CHAT",
                ids[0],
                theme,
                {
                    x: intermission ? 38 : 1344,
                    y: intermission ? 346 : 96,
                    width: intermission ? 553 : 480,
                    height: intermission ? 372 : 518,
                    zIndex: 1
                },
                {design: "windowed"}
            ),
            presetWidget(
                "SPOTIFY_NOW_PLAYING",
                ids[1],
                theme,
                {
                    x: intermission ? 38 : 1152,
                    y: intermission ? 729 : 646,
                    width: intermission ? 553 : 672,
                    height: intermission ? 275 : 302,
                    zIndex: 2
                },
                {spectralizer: true, audioDeviceName: ""}
            ),
            presetWidget("SHAPE", `${ids[0]}-taskbar`, theme, {
                x: 0,
                y: 1026,
                width: OVERLAY_WIDTH,
                height: 54,
                zIndex: 5
            }),
            presetWidget("SOCIALS", `${ids[0]}-socials`, theme, {
                x: 20,
                y: 1026,
                width: 700,
                height: 54,
                zIndex: 6
            }),
            presetWidget("CLOCK", `${ids[0]}-clock`, theme, {
                x: 1600,
                y: 1026,
                width: 300,
                height: 54,
                zIndex: 6
            })
        )
        if (intermission)
            widgets.push(
                presetWidget(
                    "WINDOW",
                    `${ids[0]}-webcam`,
                    theme,
                    {x: 38, y: 22, width: 498, height: windowHeight(498), zIndex: 1},
                    {title: "Webcam", lockContentAspectRatio: true}
                ),
                presetWidget(
                    "WINDOW",
                    `${ids[0]}-game`,
                    theme,
                    {x: 630, y: 76, width: 1252, height: windowHeight(1252), zIndex: 1},
                    {title: "Game", lockContentAspectRatio: true}
                )
            )
        else
            widgets.push(
                presetWidget(
                    "TEXT",
                    `${ids[0]}-title`,
                    theme,
                    {x: 96, y: 54, width: 1000, height: 180, zIndex: 6},
                    {
                        text: scene === "starting_soon" ? "STARTING SOON" : "STREAM ENDING"
                    }
                ),
                presetWidget(
                    "TEXT",
                    `${ids[0]}-title-dots`,
                    theme,
                    {x: 1096, y: 54, width: 120, height: 180, zIndex: 6},
                    {
                        text: "...",
                        animation: "bounce"
                    }
                )
            )
    }
    return {width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT, theme, scene, font: "tiny5", widgets}
}
