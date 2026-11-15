import type {EditorWidget} from "@streamcat/interfaces"

export function MediaSettings({
    widget,
    onChange,
    onSetBackground
}: {
    widget: Extract<EditorWidget, {type: "IMAGE" | "VIDEO"}>
    onChange: (widget: EditorWidget) => void
    onSetBackground: () => void
}) {
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
