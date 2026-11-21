import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

export function TextSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "TEXT"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Text</span>
                <input
                    className="overlay-field-input"
                    maxLength={200}
                    value={widget.params.text}
                    onChange={(event) => onChange({...widget, params: {...widget.params, text: event.target.value}})}
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Schriftgröße</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={8}
                    max={400}
                    step={1}
                    value={widget.params.fontSize}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, fontSize: Number(event.target.value)}})
                    }
                />
            </label>
            <label className="overlay-field">
                <span className="overlay-field-label">Laufweite</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={-10}
                    max={50}
                    step={0.5}
                    value={widget.params.letterSpacing}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, letterSpacing: Number(event.target.value)}})
                    }
                />
            </label>
            <Select
                label="Schriftstärke"
                value={widget.params.fontWeight}
                options={[
                    {value: "normal", label: "Normal"},
                    {value: "bold", label: "Fett"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, fontWeight: value as "normal" | "bold"}
                    })
                }
            />
            <Select
                label="Ausrichtung"
                value={widget.params.align}
                options={[
                    {value: "left", label: "Links"},
                    {value: "center", label: "Zentriert"},
                    {value: "right", label: "Rechts"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, align: value as "left" | "center" | "right"}
                    })
                }
            />
            <Select
                label="Animation"
                value={widget.params.animation}
                options={[
                    {value: "none", label: "Keine"},
                    {value: "bounce", label: "Hüpfen"},
                    {value: "pulse", label: "Pulsieren"},
                    {value: "typewriter", label: "Schreibmaschine"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {
                            ...widget.params,
                            animation: value as "none" | "bounce" | "pulse" | "typewriter"
                        }
                    })
                }
            />
            {widget.params.animation !== "none" && (
                <label className="overlay-field">
                    <span className="overlay-field-label">Animationsdauer</span>
                    <input
                        className="overlay-field-input"
                        type="number"
                        min={0.2}
                        max={20}
                        step={0.1}
                        value={widget.params.animationSeconds}
                        onChange={(event) =>
                            onChange({
                                ...widget,
                                params: {...widget.params, animationSeconds: Number(event.target.value)}
                            })
                        }
                    />
                </label>
            )}
        </>
    )
}
