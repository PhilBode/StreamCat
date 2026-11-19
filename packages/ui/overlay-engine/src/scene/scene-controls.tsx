"use client"

import {useEffect, useRef, useState} from "react"
import type {GuildOverlay} from "@streamcat/interfaces"
import {Dialog, EditorIconButton, Select} from "../ui/dialog"
import {PlusIcon, RedoIcon, UndoIcon} from "../ui/icons"

export function SceneControls({
    scenes,
    selected,
    busy,
    dirty,
    obsUrl,
    onSelect,
    onSave,
    onRotate,
    onDelete,
    onOpenCreate,
    onError,
    canUndo,
    canRedo,
    onUndo,
    onRedo
}: {
    scenes: GuildOverlay[]
    selected: GuildOverlay | null
    busy: boolean
    dirty: boolean
    obsUrl: string | null
    onSelect: (id: string) => void
    onSave: () => void
    onRotate: () => void
    onDelete: (id: string) => void
    onOpenCreate: () => void
    onError: (message: string) => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
}) {
    const [dialog, setDialog] = useState<"delete" | "reset" | null>(null)
    const [copied, setCopied] = useState(false)
    const copyReset = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (copyReset.current) clearTimeout(copyReset.current)
        },
        []
    )

    async function copyUrl() {
        if (!obsUrl) {
            onError("Für diese Szene gibt es noch keinen OBS-Link. Erstelle oder speichere die Szene zuerst.")
            return
        }
        try {
            await navigator.clipboard.writeText(obsUrl)
            setCopied(true)
            if (copyReset.current) clearTimeout(copyReset.current)
            copyReset.current = setTimeout(() => setCopied(false), 2000)
        } catch {
            onError("Der Link konnte nicht kopiert werden. Kopiere ihn manuell aus der Vorschau-Adressleiste.")
        }
    }

    const status = busy ? "Bitte warten …" : dirty ? "Ungespeichert" : selected ? "Gespeichert" : ""

    return (
        <div className="overlay-scene-bar">
            <div className="overlay-scene-bar-left">
                {selected && (
                    <Select
                        inline
                        label="Szene"
                        value={selected.id}
                        options={scenes.map((scene) => ({value: scene.id, label: scene.name}))}
                        onChange={onSelect}
                        disabled={busy}
                    />
                )}
                <span className="overlay-scene-divider" aria-hidden="true" />
                <EditorIconButton label="Szene erstellen" icon={<PlusIcon />} disabled={busy} onClick={onOpenCreate} />
            </div>
            <div className="overlay-scene-bar-right">
                {status && (
                    <span
                        className={`overlay-scene-status ${dirty ? "overlay-scene-status--dirty" : ""}`}
                        role="status"
                    >
                        <span className="overlay-scene-status-dot" aria-hidden="true" />
                        {status}
                    </span>
                )}
                {selected && (
                    <>
                        <EditorIconButton
                            label="Rückgängig (Ctrl/Cmd+Z)"
                            icon={<UndoIcon />}
                            disabled={busy || !canUndo}
                            onClick={onUndo}
                        />
                        <EditorIconButton
                            label="Wiederholen (Ctrl/Cmd+Shift+Z)"
                            icon={<RedoIcon />}
                            disabled={busy || !canRedo}
                            onClick={onRedo}
                        />
                        <span className="overlay-scene-divider" aria-hidden="true" />
                        <button type="button" className="button" disabled={busy} onClick={() => void copyUrl()}>
                            {copied ? "Kopiert ✓" : "OBS-URL kopieren"}
                        </button>
                        <button type="button" className="button" disabled={busy} onClick={() => setDialog("reset")}>
                            URL zurücksetzen
                        </button>
                        <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={() => obsUrl && window.open(obsUrl, "_blank", "noopener")}
                        >
                            Vorschau öffnen
                        </button>
                        <button type="button" className="button primary" disabled={busy || !dirty} onClick={onSave}>
                            Speichern
                        </button>
                    </>
                )}
            </div>

            {dialog === "delete" && selected && (
                <DeleteDialog selected={selected} busy={busy} onDelete={onDelete} onClose={() => setDialog(null)} />
            )}
            {dialog === "reset" && selected && (
                <Dialog
                    title="OBS-URL zurücksetzen"
                    onClose={() => setDialog(null)}
                    footer={
                        <>
                            <button type="button" className="button" disabled={busy} onClick={() => setDialog(null)}>
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                className="button danger"
                                disabled={busy}
                                onClick={() => {
                                    setDialog(null)
                                    onRotate()
                                }}
                            >
                                {busy ? "Wird zurückgesetzt …" : "OBS-URL zurücksetzen"}
                            </button>
                        </>
                    }
                >
                    <p className="overlay-dialog-field-label">Szene</p>
                    <p>{selected.name}</p>
                    <p className="overlay-dialog-warning">Das lässt sich nicht rückgängig machen.</p>
                </Dialog>
            )}
        </div>
    )
}

export function DeleteDialog({
    selected,
    busy,
    onDelete,
    onClose
}: {
    selected: GuildOverlay
    busy: boolean
    onDelete: (id: string) => void
    onClose: () => void
}) {
    return (
        <Dialog
            title="Szene löschen"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="button" disabled={busy} onClick={onClose}>
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        className="button danger"
                        disabled={busy}
                        onClick={() => {
                            onDelete(selected.id)
                            onClose()
                        }}
                    >
                        {busy ? "Wird gelöscht …" : "Szene löschen"}
                    </button>
                </>
            }
        >
            <p className="overlay-dialog-field-label">Szene</p>
            <p>{selected.name}</p>
            <p>Die Szene und alle enthaltenen Widgets werden dauerhaft gelöscht.</p>
            <p className="overlay-dialog-warning">Das lässt sich nicht rückgängig machen.</p>
        </Dialog>
    )
}
