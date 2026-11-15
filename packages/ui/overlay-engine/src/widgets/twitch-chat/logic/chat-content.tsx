import {twitchChatUrl, type EditorWidget, type OverlayChat} from "@streamcat/interfaces"

type TwitchChatWidget = Extract<EditorWidget, {type: "TWITCH_CHAT"}>

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
    const url = channel && /^[a-zA-Z0-9_]{1,25}$/.test(channel) ? twitchChatUrl(channel, widget.params) : null
    return url ? (
        <iframe
            className="overlay-chat"
            src={url}
            title={`Twitch-Chat von ${channel}`}
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
