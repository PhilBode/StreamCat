"use client"

import {useState} from "react"
import {scaleOverlayBounds, windowContentBounds, type EditorWidget} from "@streamcat/interfaces"

export function WindowObsSettings({
    widget,
    onChange
}: {
    widget: Extract<EditorWidget, {type: "WINDOW"}>
    onChange: (widget: EditorWidget) => void
}) {
    const [baseWidth, setBaseWidth] = useState(1920)
    const [message, setMessage] = useState<string | null>(null)
    const [copyError, setCopyError] = useState(false)
    const content = scaleOverlayBounds(windowContentBounds(widget), baseWidth, (baseWidth * 9) / 16)
    const bounds = {
        X: content.x,
        Y: content.y,
        Breite: content.width,
        Höhe: content.height
    }

    async function copy(value: string, label: string) {
        setMessage(null)
        setCopyError(false)
        try {
            await navigator.clipboard.writeText(value)
            setMessage(`${label} kopiert.`)
        } catch {
            setCopyError(true)
            setMessage("Kopieren nicht möglich. Bitte den Wert markieren und manuell kopieren.")
        }
    }

    return (
        <>
            <label className="overlay-checkbox">
                <input
                    type="checkbox"
                    checked={widget.params.greenScreen === true}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, greenScreen: event.target.checked}})
                    }
                />
                Greenscreen im Fenster
            </label>
            <p className="muted overlay-hint">
                Färbt nur die Content-Fläche grün (#00FF00). Speichern übernimmt den Modus in OBS.
            </p>
            <details className="overlay-window-obs">
                <summary>In OBS exakt ausrichten</summary>
                <label className="overlay-theme-control">
                    OBS-Basisauflösung
                    <select value={baseWidth} onChange={(event) => setBaseWidth(Number(event.target.value))}>
                        <option value={1920}>1920 × 1080</option>
                        <option value={2560}>2560 × 1440</option>
                        <option value={3840}>3840 × 2160</option>
                    </select>
                </label>
                <dl>
                    {Object.entries(bounds).map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                                <span>{Number(value.toFixed(2))} px</span>
                                <button
                                    type="button"
                                    className="overlay-copy-value"
                                    aria-label={`${label} kopieren`}
                                    title={`${label} kopieren`}
                                    onClick={() => void copy(String(Number(value.toFixed(2))), label)}
                                >
                                    ⧉
                                </button>
                            </dd>
                        </div>
                    ))}
                </dl>
                {message && (
                    <p
                        className={`overlay-hint ${copyError ? "notice error" : "muted"}`}
                        role={copyError ? "alert" : "status"}
                    >
                        {message}
                    </p>
                )}
                <p className="muted overlay-hint">
                    Werte für die innere Fläche ohne Header/Rahmen. Das Overlay muss die gesamte OBS-Basisfläche
                    ausfüllen.
                </p>
                <p className="muted overlay-hint">
                    In OBS: Rechtsklick auf Kamera-/Gamequelle → Transformieren → Transformation bearbeiten. Ausrichtung
                    „Oben links“ wählen, X/Y als Position und Breite/Höhe als Begrenzungsrahmen einzeln einfügen.
                    Proportional einpassen, damit das Bild nicht gestreckt wird.
                </p>
                <p className="muted overlay-hint">
                    Zum Freistellen: Farb-Key auf die Browser-Quelle, Grün #00FF00 entfernen und Kamera/Game darunter
                    platzieren. Der Filter betrifft auch andere passende Grüntöne im Overlay.
                </p>
            </details>
        </>
    )
}
