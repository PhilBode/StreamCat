import type {CSSProperties} from "react"
import {type OverlayAsset, type OverlayChat, type OverlayLayout, type OverlayPlayback} from "@streamcat/interfaces"
import {StandardScene} from "./scene/standard-scene"
import {widgetModule} from "./widgets/registry"

export const EMPTY_PLAYBACK: OverlayPlayback = {status: "disconnected", text: "Spotify nicht verbunden", albumUrl: null}

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
                const module = widgetModule(widget.type)
                const design = module.designs[widget.params.design] ?? module.designs[module.defaultDesign]
                const designTokens = {
                    ...(design.tokens ?? {}),
                    ...(widget.params.designColors ?? {})
                } as CSSProperties
                const title =
                    widget.type === "WINDOW"
                        ? (widget.params.title ?? "Fenster")
                        : widget.type === "TWITCH_CHAT"
                          ? "Stream Chat"
                          : "Currently Playing"
                const DesignComponent = design.component
                return (
                    <div
                        className={`overlay-widget overlay-design-${design.id} ${media ? "overlay-media-widget" : ""}`}
                        key={widget.id}
                        data-design={design.id}
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
                        <DesignComponent
                            widget={widget}
                            playback={playback}
                            chat={chat}
                            assets={assets}
                            interactive={interactive}
                            audioEnabled={audioEnabled}
                            title={title}
                        />
                    </div>
                )
            })}
        </div>
    )
}
