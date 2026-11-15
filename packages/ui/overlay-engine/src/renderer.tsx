import type {CSSProperties} from "react"
import {
    WIDGET_DESIGNS,
    twitchChatUrl,
    type OverlayAsset,
    type EditorWidget,
    type OverlayChat,
    type OverlayLayout,
    type OverlayPlayback
} from "@streamcat/interfaces"
import {SpotifyWidget} from "./widgets/spotify/spotify-widget"
import {StandardScene} from "./scene/standard-scene"
import {WindowFrame} from "./widgets/window-frame"

export const EMPTY_PLAYBACK: OverlayPlayback = {status: "disconnected", text: "Spotify nicht verbunden", albumUrl: null}

function WidgetContent({
    widget,
    playback,
    chat,
    assets,
    interactive,
    audioEnabled
}: {
    widget: EditorWidget
    playback: OverlayPlayback
    chat: OverlayChat
    assets: OverlayAsset[]
    interactive: boolean
    audioEnabled: boolean
}) {
    if (widget.type === "WINDOW") return null
    if (widget.type === "TWITCH_CHAT") {
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
    if (widget.type === "IMAGE" || widget.type === "VIDEO") {
        const asset = assets.find((item) => item.id === widget.params.assetId)
        if (!asset) return <div className="overlay-chat-unavailable">Asset nicht verfügbar</div>
        const style = {objectFit: widget.params.fit ?? "contain"} as const
        return widget.type === "IMAGE" ? (
            <img className="overlay-media" src={asset.url} alt="" style={style} draggable={false} />
        ) : (
            <video className="overlay-media" src={asset.url} autoPlay loop muted playsInline style={style} />
        )
    }
    return widget.type === "SPOTIFY_NOW_PLAYING" ? (
        <SpotifyWidget widget={widget} playback={playback} audioEnabled={audioEnabled} />
    ) : null
}

// Both the editor and the OBS page render these same logical pixels.
export function OverlayRenderer({
    layout,
    playback,
    chat,
    assets = [],
    interactive = false,
    audioEnabled = interactive
}: {
    layout: OverlayLayout
    playback: OverlayPlayback
    chat: OverlayChat
    assets?: OverlayAsset[]
    interactive?: boolean
    audioEnabled?: boolean
}) {
    const scene = layout.scene ?? "widgets"
    return (
        <div
            className={`overlay-renderer overlay-theme-${layout.theme} overlay-font-${layout.font ?? "tiny5"}`}
            style={{width: layout.width, height: layout.height}}
        >
            <StandardScene scene={scene} chat={chat} socials={layout.socials} />
            {layout.widgets.map((widget) => {
                const media = widget.type === "IMAGE" || widget.type === "VIDEO"
                const design = WIDGET_DESIGNS[widget.params.design]
                const designTokens = (design.tokens ?? {}) as CSSProperties
                const title =
                    widget.type === "WINDOW"
                        ? (widget.params.title ?? "Fenster")
                        : widget.type === "TWITCH_CHAT"
                          ? "Stream Chat"
                          : "Currently Playing"
                const content = (
                    <WidgetContent
                        widget={widget}
                        playback={playback}
                        chat={chat}
                        assets={assets}
                        interactive={interactive}
                        audioEnabled={audioEnabled}
                    />
                )
                return (
                    <div
                        className={`overlay-widget overlay-design-${widget.params.design} ${media ? "overlay-media-widget" : ""}`}
                        key={widget.id}
                        data-design={widget.params.design}
                        style={{
                            ...designTokens,
                            left: widget.x,
                            top: widget.y,
                            width: widget.width,
                            height: widget.height,
                            zIndex: widget.zIndex,
                            color: widget.params.color,
                            backgroundColor: widget.params.backgroundColor
                        }}
                    >
                        {media ? (
                            content
                        ) : (
                            <WindowFrame
                                title={title}
                                greenScreen={widget.type === "WINDOW" && widget.params.greenScreen === true}
                            >
                                {content}
                            </WindowFrame>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
