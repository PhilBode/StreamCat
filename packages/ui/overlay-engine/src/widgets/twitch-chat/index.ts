import {TWITCH_CHAT_DEFAULTS, TWITCH_CHAT_FONTS, type EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {twitchChatPlainDesign} from "./designs/plain"
import {twitchChatWindowedDesign} from "./designs/windowed"
import {ChatGlyph} from "./logic/chat-glyph"
import {ChatSettings} from "./logic/chat-settings"

function chatSummary(widget: EditorWidget) {
    if (widget.type !== "TWITCH_CHAT") return null
    const fontName =
        typeof widget.params.chatFont === "number"
            ? (TWITCH_CHAT_FONTS[widget.params.chatFont] ?? "Schrift")
            : (widget.params.chatFont ?? "Schrift")
    const fade = widget.params.chatFade ?? TWITCH_CHAT_DEFAULTS.chatFade
    return `${widget.params.chatChannel || "Kanal"} - ${fontName} - Fade ${fade}s`
}

export const twitchChatModule: WidgetModule = {
    type: "TWITCH_CHAT",
    label: "Twitch-Chat",
    description: "Live-Chat als eingebettete Ansicht.",
    category: "Chat",
    glyph: ChatGlyph,
    addable: true,
    defaultDesign: "windowed",
    designs: {
        windowed: twitchChatWindowedDesign,
        none: twitchChatPlainDesign
    },
    settings: ChatSettings,
    sectionLabel: "Overlay Einstellungen",
    sectionSummary: chatSummary,
    titleFor: (widget) => (widget.type === "TWITCH_CHAT" ? widget.params.title || "Stream Chat" : "Stream Chat"),
    frame: "widget"
}
