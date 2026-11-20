import type {CSSProperties} from "react"
import {
    OVERLAY_COLOR_TEMPLATES,
    type OverlayAsset,
    type OverlayChat,
    type OverlayLayout,
    type OverlayPlayback
} from "@streamcat/interfaces"
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
    const themeTemplate = OVERLAY_COLOR_TEMPLATES[layout.theme === "default" ? "standard" : layout.theme]
    const themeTokens = {
        "--progress-color": layout.themeColors?.primary ?? themeTemplate.tokens?.["--progress-color"] ?? "#1db954",
        "--window-bg": layout.themeColors?.window ?? themeTemplate.tokens?.["--window-bg"] ?? "#1b191c"
    } as CSSProperties
    const themeVars = layout.themeColors
        ? ({
              ...(layout.themeColors.primary ? {"--progress-color": layout.themeColors.primary} : {}),
              ...(layout.themeColors.secondary ? {"--gradient-end": layout.themeColors.secondary} : {}),
              ...(layout.themeColors.surface ? {"--gradient-start": layout.themeColors.surface} : {}),
              ...(layout.themeColors.window ? {"--window-bg": layout.themeColors.window} : {}),
              ...(layout.themeColors.text ? {"--scene-text": layout.themeColors.text} : {})
          } as CSSProperties)
        : undefined
    return (
        <div
            className={`overlay-renderer overlay-theme-${layout.theme} overlay-font-${layout.font ?? "tiny5"}`}
            style={{width: layout.width, height: layout.height, ...themeVars}}
        >
            <StandardScene scene={scene} chat={chat} socials={layout.socials} />
            {layout.widgets.map((widget) => {
                if (widget.hidden) return null
                const media = widget.type === "IMAGE" || widget.type === "VIDEO"
                const module = widgetModule(widget.type)
                const design = module.designs[widget.params.design] ?? module.designs[module.defaultDesign]
                const designTokens = {
                    // Scene theme beats design defaults; per-widget overrides win last.
                    ...(design.tokens ?? {}),
                    ...themeTokens,
                    ...(widget.params.designColors ?? {})
                } as CSSProperties
                const title =
                    widget.type === "WINDOW"
                        ? (widget.params.title ?? "Fenster")
                        : widget.type === "TWITCH_CHAT"
                          ? (widget.params.title ?? "Stream Chat")
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
