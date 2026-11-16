"use client"

import {useState} from "react"
import {OVERLAY_COLOR_TEMPLATES, type OverlayFont, type OverlayScene, type OverlayTheme} from "@streamcat/interfaces"
import {Dialog, Select} from "../ui/dialog"

const TEMPLATES: {
    value: OverlayScene
    label: string
    hint: string
    kind: "intermission" | "starting_soon" | "stream_ending" | "widgets"
}[] = [
    {value: "intermission", label: "Intermission", hint: "4 Widgets", kind: "intermission"},
    {value: "starting_soon", label: "Starting Soon", hint: "2 Widgets", kind: "starting_soon"},
    {value: "stream_ending", label: "Stream Ending", hint: "2 Widgets", kind: "stream_ending"},
    {value: "widgets", label: "Leer", hint: "0 Widgets", kind: "widgets"}
]

export function NewSceneDialog({
    busy,
    onCreate,
    onClose
}: {
    busy: boolean
    onCreate: (name: string, scene: OverlayScene, theme: OverlayTheme, font: OverlayFont) => void
    onClose: () => void
}) {
    const [name, setName] = useState("")
    const [scene, setScene] = useState<OverlayScene>("intermission")
    const [theme, setTheme] = useState<OverlayTheme>("default")
    const [font, setFont] = useState<OverlayFont>("tiny5")
    const colors = OVERLAY_COLOR_TEMPLATES[theme === "default" ? "standard" : theme]

    return (
        <Dialog
            title="Neue Szene"
            onClose={onClose}
            width={640}
            footer={
                <>
                    <button type="button" className="button" disabled={busy} onClick={onClose}>
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        className="button primary"
                        disabled={busy || !name.trim()}
                        onClick={() => {
                            onCreate(name.trim(), scene, theme, font)
                            onClose()
                        }}
                    >
                        {busy ? "Wird erstellt …" : "Szene erstellen"}
                    </button>
                </>
            }
        >
            <div className="overlay-field">
                <label className="overlay-field-label" htmlFor="overlay-new-scene-name">
                    Name
                </label>
                <input
                    id="overlay-new-scene-name"
                    className="overlay-field-input"
                    placeholder="Szene Name"
                    value={name}
                    maxLength={80}
                    required
                    disabled={busy}
                    autoFocus
                    onChange={(event) => setName(event.target.value)}
                />
            </div>
            <div className="overlay-field">
                <span className="overlay-field-label">Basis</span>
                <div className="overlay-template-grid">
                    {TEMPLATES.map((template) => (
                        <button
                            key={template.value}
                            type="button"
                            className={`overlay-template-card ${scene === template.value ? "overlay-template-card--active" : ""}`}
                            onClick={() => setScene(template.value)}
                        >
                            <span
                                className={`overlay-template-preview overlay-template-preview--${template.kind}`}
                                aria-hidden="true"
                            >
                                {template.kind === "starting_soon" && <em>STARTING SOON</em>}
                                {template.kind === "stream_ending" && <em>STREAM ENDING</em>}
                                {template.kind === "intermission" && (
                                    <span className="overlay-template-preview-lines">
                                        <i />
                                        <i />
                                        <i className="accent" />
                                    </span>
                                )}
                            </span>
                            <span className="overlay-template-label">{template.label}</span>
                            <span className="overlay-template-hint">{template.hint}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="overlay-dialog-columns">
                <Select
                    label="Theme"
                    value={theme}
                    options={[
                        {value: "default", label: "Standard"},
                        {value: "autumn", label: "Herbst"},
                        {value: "winter", label: "Winter"}
                    ]}
                    onChange={(value) => setTheme(value as OverlayTheme)}
                />
                <Select
                    label="Schrift"
                    value={font}
                    options={[
                        {value: "tiny5", label: "Tiny5 · Original"},
                        {value: "jersey10", label: "Jersey 10"}
                    ]}
                    onChange={(value) => setFont(value as OverlayFont)}
                />
                <div className="overlay-template-colors">
                    <span className="overlay-field-label">Farben</span>
                    <span className="overlay-template-color">
                        <i style={{background: colors.color}} />
                        Text {colors.color.toUpperCase()}
                    </span>
                    <span className="overlay-template-color">
                        <i style={{background: colors.backgroundColor}} />
                        Hintergrund
                    </span>
                </div>
            </div>
        </Dialog>
    )
}
