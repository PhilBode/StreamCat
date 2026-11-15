import {OVERLAY_WIDTH, OVERLAY_HEIGHT, type EditorWidget} from "@streamcat/interfaces"
import {lockedWindowSize} from "./window-resize"
import {WindowObsSettings} from "./window-obs-settings"

export function WindowSettings({
    widget,
    onChange
}: {
    widget: Extract<EditorWidget, {type: "WINDOW"}>
    onChange: (widget: EditorWidget) => void
}) {
    function lockContent(locked: boolean) {
        const size = locked
            ? lockedWindowSize(widget.width, widget.height, OVERLAY_WIDTH - widget.x, OVERLAY_HEIGHT, "width")
            : {width: widget.width, height: widget.height}
        onChange({
            ...widget,
            ...size,
            y: Math.min(widget.y, OVERLAY_HEIGHT - size.height),
            params: {...widget.params, lockContentAspectRatio: locked}
        })
    }

    return (
        <>
            <label className="overlay-theme-control">
                Fenstertitel
                <input
                    maxLength={80}
                    value={widget.params.title ?? "Fenster"}
                    onChange={(event) => onChange({...widget, params: {...widget.params, title: event.target.value}})}
                />
            </label>
            <label className="overlay-checkbox">
                <input
                    type="checkbox"
                    checked={widget.params.lockContentAspectRatio === true}
                    onChange={(event) => lockContent(event.target.checked)}
                />
                Content auf 16:9 sperren
            </label>
            <p className="muted overlay-hint">
                Gilt für die innere Fläche unter dem Header. Webcam/Game bleiben separate OBS-Quellen.
            </p>
            <WindowObsSettings key={widget.id} widget={widget} onChange={onChange} />
        </>
    )
}
