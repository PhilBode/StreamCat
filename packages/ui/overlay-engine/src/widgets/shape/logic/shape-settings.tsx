import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"

export function ShapeSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "SHAPE"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Eckenradius</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={widget.params.radius}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, radius: Number(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Deckkraft</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={widget.params.opacity}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, opacity: Number(event.target.value)}})
                    }
                />
            </label>
        </>
    )
}
