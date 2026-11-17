import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

export function MediaSettings({widget: value, onChange, onSetBackground}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "IMAGE" | "VIDEO"}>
    return (
        <>
            <Select
                label="Darstellung"
                value={widget.params.fit ?? "contain"}
                options={[
                    {value: "contain", label: "Ganzes Bild / Video"},
                    {value: "cover", label: "Fläche ausfüllen · zuschneiden"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, fit: value as "contain" | "cover"}
                    })
                }
            />
            <button type="button" className="button" onClick={onSetBackground}>
                Als Hintergrund
            </button>
            {widget.type === "VIDEO" && (
                <p className="overlay-settings-hint">Videos laufen automatisch, stumm und in einer Schleife.</p>
            )}
        </>
    )
}
