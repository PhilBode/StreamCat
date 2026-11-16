import {OVERLAY_WIDTH, OVERLAY_HEIGHT, type EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {lockedWindowSize} from "./window-resize"

export function WindowSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "WINDOW"}>
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
            <label className="overlay-field">
                <span className="overlay-field-label">Fenstertitel</span>
                <input
                    className="overlay-field-input"
                    maxLength={80}
                    value={widget.params.title ?? "Fenster"}
                    onChange={(event) => onChange({...widget, params: {...widget.params, title: event.target.value}})}
                />
            </label>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.lockContentAspectRatio === true}
                    onChange={(event) => lockContent(event.target.checked)}
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Content auf 16:9 sperren
            </label>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.greenScreen === true}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, greenScreen: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Greenscreen
            </label>
            <p className="overlay-settings-hint">
                Färbt nur die Content-Fläche grün (#00FF00). Speichern übernimmt den Modus in OBS.
            </p>
        </>
    )
}
