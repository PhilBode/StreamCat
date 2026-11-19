"use client"

import {useState} from "react"
import {scaleOverlayBounds, windowContentBounds, type EditorWidget} from "@streamcat/interfaces"
import {SidebarSection, Select} from "../../../ui/dialog"

const BASE_RESOLUTIONS = [
    {value: "1920", label: "1920 × 1080"},
    {value: "2560", label: "2560 × 1440"},
    {value: "3840", label: "3840 × 2160"}
]

export function WindowObsSettings({widget}: {widget: Extract<EditorWidget, {type: "WINDOW"}>}) {
    const [baseWidth, setBaseWidth] = useState(1920)
    const [message, setMessage] = useState<string | null>(null)
    const content = scaleOverlayBounds(windowContentBounds(widget), baseWidth, (baseWidth * 9) / 16)
    const values: [string, number][] = [
        ["X", content.x],
        ["Y", content.y],
        ["Breite", content.width],
        ["Höhe", content.height]
    ]
    const summary = `${baseWidth} × ${Math.round((baseWidth * 9) / 16)} - Content ${Math.round(content.width)} × ${Math.round(content.height)}`

    async function copyAll() {
        setMessage(null)
        try {
            await navigator.clipboard.writeText(
                values.map(([label, value]) => `${label}: ${Number(value.toFixed(2))}`).join(" · ")
            )
            setMessage("Alle Werte kopiert.")
        } catch {
            setMessage("Kopieren nicht möglich. Bitte die Werte manuell übernehmen.")
        }
    }

    return (
        <SidebarSection label="In OBS ausrichten" summary={summary}>
            <Select
                label="OBS-Basisauflösung"
                value={String(baseWidth)}
                options={BASE_RESOLUTIONS}
                onChange={(value) => setBaseWidth(Number(value))}
            />
            <p className="overlay-settings-hint">
                Gilt für die Kameraquelle in OBS, nicht für dieses Widget. Die Werte folgen dem Fenster.
            </p>
            <div className="overlay-obs-values">
                {values.map(([label, value]) => (
                    <div className="overlay-obs-value" key={label}>
                        <span className="overlay-obs-value-label">{label}</span>
                        <span className="overlay-obs-value-number">{Number(value.toFixed(2))}</span>
                    </div>
                ))}
            </div>
            <button type="button" className="button overlay-obs-copy" onClick={() => void copyAll()}>
                Alle Werte kopieren
            </button>
            {message && (
                <p className="overlay-settings-hint" role="status">
                    {message}
                </p>
            )}
            <p className="overlay-settings-hint overlay-obs-steps">
                {
                    "1  Quelle in OBS wählen\n2  Transformieren → Transformation bearbeiten\n3  Ausrichtung oben links, Werte einfügen"
                }
            </p>
        </SidebarSection>
    )
}
