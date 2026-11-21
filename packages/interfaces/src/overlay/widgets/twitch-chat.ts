import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

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

function chatFont(value: unknown): number | string {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TWITCH_CHAT_FONTS.length)
        return value
    if (typeof value === "string") {
        const name = value.trim()
        if (!name) return TWITCH_CHAT_DEFAULTS.chatFont
        if (name.length <= 100 && /^[a-z0-9][a-z0-9 -]*$/i.test(name) && /[a-z]/i.test(name)) return name
    }
    throw new WidgetParamError("Ungültige Chat-Schrift. Gib einen Schriftnamen ein, z. B. Tiny5.")
}

function safeChatFont(value: unknown): number | string {
    try {
        return chatFont(value)
    } catch {
        return TWITCH_CHAT_DEFAULTS.chatFont
    }
}

function chatTitle(value: unknown): string {
    if (value === undefined) return "Stream Chat"
    if (typeof value !== "string" || value.length > 80)
        throw new WidgetParamError("Der Fenstertitel darf maximal 80 Zeichen enthalten.")
    return value.trim() || "Stream Chat"
}

function safeChatTitle(value: unknown): string {
    return typeof value === "string" && value.length <= 80 ? value.trim() || "Stream Chat" : "Stream Chat"
}

function chatChannel(value: unknown): string {
    const channel = value ?? ""
    if (typeof channel !== "string" || (channel.trim() && !/^[a-zA-Z0-9_]{1,25}$/.test(channel.trim())))
        throw new WidgetParamError("Ungültiger Twitch-Kanal.")
    return channel.trim()
}

function numberSetting(raw: Record<string, unknown>, key: "chatSize" | "chatFade", max: number): number | undefined {
    if (raw[key] === undefined) return undefined
    const value = raw[key]
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max)
        throw new WidgetParamError("Ungültige Chat-Einstellung.")
    return value
}

function booleanSetting(raw: Record<string, unknown>, key: keyof typeof TWITCH_CHAT_DEFAULTS): boolean | undefined {
    if (raw[key] === undefined) return undefined
    if (typeof raw[key] !== "boolean") throw new WidgetParamError("Ungültige Chat-Einstellung.")
    return raw[key]
}

export const twitchChatSpec: WidgetSpec<ChatWidgetParams> = {
    width: 440,
    height: 560,
    defaults(appearance) {
        return {
            ...appearance,
            ...TWITCH_CHAT_DEFAULTS,
            title: "Stream Chat"
        }
    },
    parse(raw, {appearance}) {
        const settings = {
            ...TWITCH_CHAT_DEFAULTS,
            ...appearance,
            title: chatTitle(raw.title),
            chatChannel: chatChannel(raw.chatChannel),
            chatFont: chatFont(raw.chatFont ?? TWITCH_CHAT_DEFAULTS.chatFont)
        }
        const size = numberSetting(raw, "chatSize", 3)
        const fade = numberSetting(raw, "chatFade", 3600)
        const animate = booleanSetting(raw, "chatAnimate")
        const bots = booleanSetting(raw, "chatBots")
        const hideCommands = booleanSetting(raw, "chatHideCommands")
        const hideBadges = booleanSetting(raw, "chatHideBadges")
        if (size !== undefined) settings.chatSize = size
        if (fade !== undefined) settings.chatFade = fade
        if (animate !== undefined) settings.chatAnimate = animate
        if (bots !== undefined) settings.chatBots = bots
        if (hideCommands !== undefined) settings.chatHideCommands = hideCommands
        if (hideBadges !== undefined) settings.chatHideBadges = hideBadges
        return settings
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            ...TWITCH_CHAT_DEFAULTS,
            title: safeChatTitle(raw.title),
            chatChannel: typeof raw.chatChannel === "string" ? raw.chatChannel.slice(0, 25) : "",
            chatFont: safeChatFont(raw.chatFont),
            chatSize:
                typeof raw.chatSize === "number" &&
                Number.isInteger(raw.chatSize) &&
                raw.chatSize >= 0 &&
                raw.chatSize <= 3
                    ? raw.chatSize
                    : TWITCH_CHAT_DEFAULTS.chatSize,
            chatFade:
                typeof raw.chatFade === "number" &&
                Number.isInteger(raw.chatFade) &&
                raw.chatFade >= 0 &&
                raw.chatFade <= 3600
                    ? raw.chatFade
                    : TWITCH_CHAT_DEFAULTS.chatFade,
            chatAnimate: typeof raw.chatAnimate === "boolean" ? raw.chatAnimate : TWITCH_CHAT_DEFAULTS.chatAnimate,
            chatBots: typeof raw.chatBots === "boolean" ? raw.chatBots : TWITCH_CHAT_DEFAULTS.chatBots,
            chatHideCommands:
                typeof raw.chatHideCommands === "boolean"
                    ? raw.chatHideCommands
                    : TWITCH_CHAT_DEFAULTS.chatHideCommands,
            chatHideBadges:
                typeof raw.chatHideBadges === "boolean" ? raw.chatHideBadges : TWITCH_CHAT_DEFAULTS.chatHideBadges
        }
    }
}
