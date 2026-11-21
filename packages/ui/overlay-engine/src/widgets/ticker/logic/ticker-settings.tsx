import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

export function TickerSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "TICKER"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Text</span>
                <input
                    className="overlay-field-input"
                    maxLength={500}
                    value={widget.params.text}
                    onChange={(event) => onChange({...widget, params: {...widget.params, text: event.target.value}})}
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Trenner</span>
                <input
                    className="overlay-field-input"
                    maxLength={20}
                    value={widget.params.separator}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, separator: event.target.value}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Dauer pro Durchlauf</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={2}
                    max={120}
                    step={1}
                    value={widget.params.speedSeconds}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, speedSeconds: Number(event.target.value)}})
                    }
                />
            </label>
            <Select
                label="Richtung"
                value={widget.params.direction}
                options={[
                    {value: "left", label: "Nach links"},
                    {value: "right", label: "Nach rechts"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, direction: value as "left" | "right"}
                    })
                }
            />
        </>
    )
}
