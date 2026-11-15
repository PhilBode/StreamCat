import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"

export function MediaSettings({widget: value, onChange, onSetBackground}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "IMAGE" | "VIDEO"}>
    return (
        <>
            <label className="overlay-theme-control">
                Darstellung
                <select
                    value={widget.params.fit ?? "contain"}
                    onChange={(event) =>
                        onChange({
                            ...widget,
                            params: {...widget.params, fit: event.target.value as "contain" | "cover"}
                        })
                    }
                >
                    <option value="contain">Ganzes Bild / Video</option>
                    <option value="cover">Fläche ausfüllen · zuschneiden</option>
                </select>
            </label>
            <button className="button" onClick={onSetBackground}>
                Als Hintergrund
            </button>
            {widget.type === "VIDEO" && (
                <p className="muted overlay-hint">Videos laufen automatisch, stumm und in einer Schleife.</p>
            )}
        </>
    )
}
