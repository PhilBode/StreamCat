import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"

export function BackgroundSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "BACKGROUND"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Umdrehungen in Sekunden</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={widget.params.speedSeconds}
                    onChange={(event) =>
                        onChange({
                            ...widget,
                            params: {...widget.params, speedSeconds: Number(event.target.value)}
                        })
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Weichzeichnen</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={widget.params.blur}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, blur: Number(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Abdunklung</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={widget.params.dim}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, dim: Number(event.target.value)}})
                    }
                />
            </label>
        </>
    )
}
