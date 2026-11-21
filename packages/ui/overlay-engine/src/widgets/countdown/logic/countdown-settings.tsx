import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

function toLocalInput(value: string) {
    if (!value) return ""
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ""
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function fromLocalInput(value: string) {
    if (!value) return ""
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toISOString() : ""
}

export function CountdownSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "COUNTDOWN"}>
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
                <span className="overlay-field-label">Ziel</span>
                <input
                    className="overlay-field-input"
                    type="datetime-local"
                    value={toLocalInput(widget.params.target)}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, target: fromLocalInput(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Text bei Ablauf</span>
                <input
                    className="overlay-field-input"
                    maxLength={80}
                    value={widget.params.completeText}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, completeText: event.target.value}})
                    }
                />
            </label>
            <Select
                label="Format"
                value={widget.params.format}
                options={[
                    {value: "dhms", label: "Tage, Stunden, Minuten"},
                    {value: "hms", label: "Stunden, Minuten, Sekunden"},
                    {value: "ms", label: "Minuten, Sekunden"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, format: value as "dhms" | "hms" | "ms"}
                    })
                }
            />
        </>
    )
}
