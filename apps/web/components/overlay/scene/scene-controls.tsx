"use client"

import {useState} from "react"
import type {GuildOverlay, OverlayScene} from "@streamcat/interfaces"

export function SceneControls({
    scenes,
    selected,
    busy,
    dirty,
    onSelect,
    onCreate,
    onRename,
    onSave,
    canUndo,
    canRedo,
    onUndo,
    onRedo
}: {
    scenes: GuildOverlay[]
    selected: GuildOverlay | null
    busy: boolean
    dirty: boolean
    onSelect: (id: string) => void
    onCreate: (name: string, scene: OverlayScene) => void
    onRename: (name: string) => void
    onSave: () => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
}) {
    const [form, setForm] = useState<"create" | "rename" | null>(selected ? null : "create")
    const [name, setName] = useState(selected?.name ?? "")
    const [newName, setNewName] = useState("")
    const [template, setTemplate] = useState<OverlayScene>("intermission")
    return (
        <section className="panel overlay-scenes" aria-label="Szenen verwalten">
            <div className="overlay-scene-toolbar">
                {selected && (
                    <label className="overlay-scene-select">
                        Szene
                        <select value={selected.id} disabled={busy} onChange={(event) => onSelect(event.target.value)}>
                            {scenes.map((scene) => (
                                <option key={scene.id} value={scene.id}>
                                    {scene.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <span className={`overlay-save-state ${dirty ? "pending" : "muted"}`} role="status">
                    {busy
                        ? "Bitte warten …"
                        : dirty
                          ? "Ungespeichert"
                          : selected
                            ? "Gespeichert"
                            : "Jede Szene hat ihren eigenen OBS-Link"}
                </span>
                <div className="actions">
                    {selected && (
                        <>
                            <button
                                className="button"
                                disabled={busy || !canUndo}
                                onClick={onUndo}
                                title="Rückgängig (Ctrl/Cmd+Z)"
                            >
                                ↶ Rückgängig
                            </button>
                            <button
                                className="button"
                                disabled={busy || !canRedo}
                                onClick={onRedo}
                                title="Wiederholen (Ctrl/Cmd+Shift+Z oder Ctrl+Y)"
                            >
                                ↷ Wiederholen
                            </button>
                        </>
                    )}
                    {selected && (
                        <button className="button primary" disabled={busy || !dirty} onClick={onSave}>
                            Speichern
                        </button>
                    )}
                    <button
                        className="button"
                        disabled={busy || dirty || scenes.length >= 20}
                        onClick={() => setForm(form === "create" ? null : "create")}
                    >
                        ＋ Neue Szene
                    </button>
                    {selected && (
                        <button
                            className="button"
                            disabled={busy}
                            onClick={() => setForm(form === "rename" ? null : "rename")}
                            aria-label="Szene umbenennen"
                        >
                            Umbenennen
                        </button>
                    )}
                </div>
            </div>
            {form === "rename" && selected && (
                <form
                    className="overlay-scene-fields"
                    onSubmit={(event) => {
                        event.preventDefault()
                        onRename(name.trim())
                    }}
                >
                    <label>
                        Szenenname
                        <input
                            value={name}
                            maxLength={80}
                            required
                            onChange={(event) => setName(event.target.value)}
                            disabled={busy}
                            autoFocus
                        />
                    </label>
                    <button
                        className="button"
                        type="submit"
                        disabled={busy || !name.trim() || name.trim() === selected.name}
                    >
                        Name speichern
                    </button>
                    <button className="button" type="button" onClick={() => setForm(null)}>
                        Abbrechen
                    </button>
                </form>
            )}
            {form === "create" && (
                <form
                    className="overlay-scene-fields"
                    onSubmit={(event) => {
                        event.preventDefault()
                        onCreate(newName.trim(), template)
                    }}
                >
                    <label>
                        Neue Szene
                        <input
                            value={newName}
                            maxLength={80}
                            placeholder="z. B. Gaming oder Pause"
                            required
                            onChange={(event) => setNewName(event.target.value)}
                            disabled={busy || dirty}
                            autoFocus
                        />
                    </label>
                    <label>
                        Startvorlage
                        <select
                            value={template}
                            onChange={(event) => setTemplate(event.target.value as OverlayScene)}
                            disabled={busy || dirty}
                        >
                            <option value="intermission">Intermission</option>
                            <option value="starting_soon">Starting Soon</option>
                            <option value="stream_ending">Stream Ending</option>
                            <option value="widgets">Leere Szene (transparent)</option>
                        </select>
                    </label>
                    <button
                        className="button"
                        type="submit"
                        disabled={busy || dirty || !newName.trim() || scenes.length >= 20}
                    >
                        Erstellen
                    </button>
                    {selected && (
                        <button className="button" type="button" onClick={() => setForm(null)}>
                            Abbrechen
                        </button>
                    )}
                </form>
            )}
        </section>
    )
}
