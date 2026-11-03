import {widgetName} from "./definitions"
import {SpotifySettings} from "./spotify/spotify-settings"
import {ChatSettings} from "./twitch-chat/chat-settings"
import {WindowSettings} from "./window/window-settings"
import {MediaSettings} from "./media/media-settings"
import {
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    MIN_WIDGET_WIDTH,
    MIN_WIDGET_HEIGHT,
    withWidgetColors,
    windowWidth,
    windowHeight,
    type EditorWidget,
    type OverlayAsset
} from "@streamcat/interfaces"
import {lockedWindowSize} from "./window/window-resize"
import {ColorField} from "./color-field"

export function WidgetSettings({
    widget,
    assets = [],
    onChange,
    onRemove,
    onSetBackground,
    previewAudio = false,
    onPreviewAudioChange
}: {
    widget: EditorWidget
    assets?: OverlayAsset[]
    onChange: (widget: EditorWidget) => void
    onRemove: () => void
    previewAudio?: boolean
    onPreviewAudioChange?: (enabled: boolean) => void
    onSetBackground: () => void
}) {
    const locked = widget.type === "WINDOW" && widget.params.lockContentAspectRatio === true
    const limits = {
        x: [0, OVERLAY_WIDTH - widget.width],
        y: [0, OVERLAY_HEIGHT - widget.height],
        width: [MIN_WIDGET_WIDTH, OVERLAY_WIDTH - widget.x],
        height: [MIN_WIDGET_HEIGHT, OVERLAY_HEIGHT - widget.y]
    }
    if (locked) {
        limits.width[1] = Math.min(limits.width[1], windowWidth(OVERLAY_HEIGHT - widget.y))
        limits.height = [
            windowHeight(MIN_WIDGET_WIDTH),
            Math.min(limits.height[1], windowHeight(OVERLAY_WIDTH - widget.x))
        ]
    }

    function updateGeometry(field: "x" | "y" | "width" | "height", value: string) {
        if (!value) return
        const parsedValue = Number(value)
        if (!Number.isFinite(parsedValue)) return
        if (locked && (field === "width" || field === "height")) {
            const size = lockedWindowSize(
                field === "width" ? parsedValue : widget.width,
                field === "height" ? parsedValue : widget.height,
                OVERLAY_WIDTH - widget.x,
                OVERLAY_HEIGHT - widget.y,
                field
            )
            onChange({...widget, ...size})
            return
        }
        onChange({...widget, [field]: Math.min(limits[field][1], Math.max(limits[field][0], parsedValue))})
    }

    return (
        <section className="overlay-settings">
            <h3>{widgetName(widget, assets)} bearbeiten</h3>
            {widget.type === "WINDOW" && <WindowSettings widget={widget} onChange={onChange} />}
            <div className="overlay-geometry">
                {(["x", "y", "width", "height"] as const).map((field) => (
                    <label key={field}>
                        <span>{{x: "X", y: "Y", width: "Breite", height: "Höhe"}[field]}</span>
                        <input
                            type="number"
                            step="any"
                            value={widget[field]}
                            min={limits[field][0]}
                            max={limits[field][1]}
                            onChange={(event) => updateGeometry(field, event.target.value)}
                        />
                    </label>
                ))}
            </div>
            {(widget.type === "SPOTIFY_NOW_PLAYING" || widget.type === "WINDOW") && (
                <ColorField
                    label="Textfarbe"
                    value={widget.params.color}
                    onChange={(color) => onChange({...widget, params: {...widget.params, color}})}
                />
            )}
            <ColorField
                label="Hintergrund"
                value={widget.params.backgroundColor}
                onChange={(backgroundColor) => onChange(withWidgetColors(widget, {backgroundColor}))}
            />
            {widget.type === "SPOTIFY_NOW_PLAYING" && (
                <SpotifySettings
                    widget={widget}
                    onChange={onChange}
                    previewAudio={previewAudio}
                    onPreviewAudioChange={onPreviewAudioChange}
                />
            )}
            {widget.type === "TWITCH_CHAT" && <ChatSettings widget={widget} onChange={onChange} />}
            {(widget.type === "IMAGE" || widget.type === "VIDEO") && (
                <MediaSettings widget={widget} onChange={onChange} onSetBackground={onSetBackground} />
            )}
            <button className="button overlay-remove" onClick={onRemove}>
                Widget entfernen
            </button>
        </section>
    )
}
