import {
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    type EditorWidget,
    type ChatWidgetParams,
    type OverlayLayout,
    type OverlayScene,
    type OverlayTheme
} from "./overlay-dashboard"
import {windowHeight} from "./window-geometry"

// Keep this order: existing scenes store the chat provider's numeric font index.
export const TWITCH_CHAT_FONTS = [
    "Baloo Tammudu",
    "Segoe UI",
    "Roboto",
    "Lato",
    "Noto Sans",
    "Source Code Pro",
    "Impact",
    "Comfortaa",
    "Dancing Script",
    "Indie Flower",
    "Press Start 2P",
    "Wallpoet"
] as const

export const TWITCH_CHAT_DEFAULTS = {
    chatChannel: "",
    chatFont: 2,
    chatSize: 3,
    chatFade: 30,
    chatAnimate: true,
    chatBots: true,
    chatHideCommands: true,
    chatHideBadges: true
}

export function twitchChatUrl(
    channel: string | null | undefined,
    params: Partial<ChatWidgetParams> = {}
): string | null {
    const selected = params.chatChannel?.trim() || channel?.trim()
    if (!selected || !/^[a-zA-Z0-9_]{1,25}$/.test(selected)) return null
    const settings = {...TWITCH_CHAT_DEFAULTS, ...params}
    const url = new URL("https://chat.johnnycyan.com/v2/")
    url.search = new URLSearchParams({
        channel: selected.toLowerCase(),
        font:
            String(settings.chatFont ?? TWITCH_CHAT_DEFAULTS.chatFont).trim() || String(TWITCH_CHAT_DEFAULTS.chatFont),
        size: String(settings.chatSize),
        fade: String(settings.chatFade),
        animate: String(settings.chatAnimate),
        bots: String(settings.chatBots),
        hide_commands: String(settings.chatHideCommands),
        hide_badges: String(settings.chatHideBadges),
        small_caps: "false",
        invert: "false"
    }).toString()
    return url.toString()
}

export const OVERLAY_THEME_COLORS: Record<OverlayTheme, {color: string; backgroundColor: string}> = {
    default: {color: "#ffffff", backgroundColor: "#1b191ca1"},
    autumn: {color: "#f6aa1c", backgroundColor: "#62170854"},
    winter: {color: "#d3d2c6", backgroundColor: "#6d6d695e"},
    dark: {color: "#f2f2f7", backgroundColor: "#171821"},
    light: {color: "#171821", backgroundColor: "#f2f2f7"},
    glass: {color: "#ffffff", backgroundColor: "transparent"}
}

// The caller supplies IDs so the same preset works in the browser and backend.
export function overlayPreset(
    scene: OverlayScene,
    ids: [string, string],
    theme: OverlayTheme = "default"
): OverlayLayout {
    const intermission = scene === "intermission"
    const widgets: EditorWidget[] =
        scene === "widgets"
            ? []
            : [
                  {
                      id: ids[0],
                      type: "TWITCH_CHAT",
                      x: intermission ? 38 : 1344,
                      y: intermission ? 346 : 96,
                      width: intermission ? 553 : 480,
                      height: intermission ? 372 : 518,
                      zIndex: 1,
                      params: {...OVERLAY_THEME_COLORS[theme]}
                  },
                  {
                      id: ids[1],
                      type: "SPOTIFY_NOW_PLAYING",
                      x: intermission ? 38 : 1152,
                      y: intermission ? 729 : 646,
                      width: intermission ? 553 : 672,
                      height: intermission ? 275 : 302,
                      zIndex: 2,
                      params: {...OVERLAY_THEME_COLORS[theme], spectralizer: true, audioDeviceName: ""}
                  }
              ]
    if (intermission)
        widgets.push(
            {
                id: `${ids[0]}-webcam`,
                type: "WINDOW",
                x: 38,
                y: 22,
                width: 498,
                height: windowHeight(498),
                zIndex: 1,
                params: {...OVERLAY_THEME_COLORS[theme], title: "Webcam", lockContentAspectRatio: true}
            },
            {
                id: `${ids[0]}-game`,
                type: "WINDOW",
                x: 630,
                y: 76,
                width: 1252,
                height: windowHeight(1252),
                zIndex: 1,
                params: {...OVERLAY_THEME_COLORS[theme], title: "Game", lockContentAspectRatio: true}
            }
        )
    return {width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT, theme, scene, font: "tiny5", widgets}
}
