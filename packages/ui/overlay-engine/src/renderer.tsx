import type {CSSProperties} from "react"
import {
    OVERLAY_COLOR_TEMPLATES,
    type OverlayAsset,
    type OverlayChat,
    type OverlayLayout,
    type OverlayPlayback
} from "@streamcat/interfaces"
import {widgetModule} from "./widgets/registry"

export const EMPTY_PLAYBACK: OverlayPlayback = {status: "disconnected", text: "Spotify nicht verbunden", albumUrl: null}

function widgetTypeClass(type: string) {
    return type.toLowerCase().replaceAll("_", "-")
}

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
            {layout.widgets.map((widget) => {
                if (widget.hidden) return null
                const module = widgetModule(widget.type)
                const frameless = module.frame === "none"
                const design = module.designs[widget.params.design] ?? module.designs[module.defaultDesign]
                const designTokens = {
                    ...(design.tokens ?? {}),
                    ...themeTokens,
                    ...(widget.params.designColors ?? {})
                } as CSSProperties
                const title = module.titleFor?.(widget) ?? module.label
                const DesignComponent = design.component
                return (
                    <div
                        className={`overlay-widget overlay-widget--${widgetTypeClass(widget.type)} overlay-design-${design.id} ${frameless ? "overlay-widget--frameless" : ""}`}
                        key={widget.id}
                        data-widget-type={widget.type}
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
