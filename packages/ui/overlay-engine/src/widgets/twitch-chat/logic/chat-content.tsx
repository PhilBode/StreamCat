import {
    TWITCH_CHAT_DEFAULTS,
    TWITCH_CHAT_FONTS,
    twitchChatUrl,
    type EditorWidget,
    type OverlayChat
} from "@streamcat/interfaces"
import "../designs/chat-base.css"

type TwitchChatWidget = Extract<EditorWidget, {type: "TWITCH_CHAT"}>

function withPreviewSettings(url: string, widget: TwitchChatWidget, channel: string | null): string {
    if (typeof window === "undefined") return url
    const target = new URL(url, window.location.href)
    const settings = {...TWITCH_CHAT_DEFAULTS, ...widget.params}
    const font =
        typeof settings.chatFont === "number"
            ? (TWITCH_CHAT_FONTS[settings.chatFont] ?? TWITCH_CHAT_FONTS[TWITCH_CHAT_DEFAULTS.chatFont])
            : settings.chatFont || TWITCH_CHAT_FONTS[TWITCH_CHAT_DEFAULTS.chatFont]
    target.searchParams.set("channel", channel ?? "")
    target.searchParams.set("font", font)
    target.searchParams.set("size", String(settings.chatSize))
    target.searchParams.set("fade", String(settings.chatFade))
    target.searchParams.set("animate", String(settings.chatAnimate))
    target.searchParams.set("bots", String(settings.chatBots))
    target.searchParams.set("hide_commands", String(settings.chatHideCommands))
    target.searchParams.set("hide_badges", String(settings.chatHideBadges))
    return target.toString()
}

export function TwitchChatContent({
    widget,
    chat,
    interactive
}: {
    widget: TwitchChatWidget
    chat: OverlayChat
    interactive: boolean
}) {
    const channel = widget.params.chatChannel?.trim() || chat.channel
    const previewUrl = chat.previewUrl?.trim()
    const url = previewUrl
        ? withPreviewSettings(previewUrl, widget, channel)
        : channel && /^[a-zA-Z0-9_]{1,25}$/.test(channel)
          ? twitchChatUrl(channel, widget.params)
          : null
    return url ? (
        <iframe
            className="overlay-chat"
            src={url}
            title={channel ? `Twitch-Chat von ${channel}` : "Twitch-Chat (Demo)"}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
            style={{pointerEvents: interactive ? "auto" : "none"}}
        />
    ) : (
        <div className="overlay-chat-unavailable">
            <span>TWITCH CHAT</span>
            <strong>Twitch-Kanal einstellen</strong>
        </div>
    )
}
