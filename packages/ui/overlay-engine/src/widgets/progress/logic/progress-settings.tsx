import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"

export function ProgressSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "PROGRESS"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Label</span>
                <input
                    className="overlay-field-input"
                    maxLength={80}
                    value={widget.params.label}
                    onChange={(event) => onChange({...widget, params: {...widget.params, label: event.target.value}})}
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Aktuell</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    value={widget.params.current}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, current: Number(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Ziel</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    value={widget.params.target}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, target: Number(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.showValue}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, showValue: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Werte anzeigen
            </label>
        </>
    )
}
