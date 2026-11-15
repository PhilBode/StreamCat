"use client"

import {useState} from "react"

export function ObsLink({
    url,
    busy,
    onReset,
    onError
}: {
    url: string | null
    busy: boolean
    onReset: () => void
    onError: (message: string) => void
}) {
    const [visible, setVisible] = useState(false)
    const [copied, setCopied] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)

    async function copy() {
        if (!url) return
        setVisible(false)
        setCopied(false)
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
        } catch {
            onError("Der Link konnte nicht kopiert werden. Blende ihn ein, um ihn manuell zu kopieren.")
        }
    }

    return (
        <section className="panel overlay-link" aria-label="OBS-Link">
            <label htmlFor="obs-link">OBS-Link</label>
            <input
                id="obs-link"
                type={visible ? "text" : "password"}
                className={url && !visible ? "overlay-link-concealed" : ""}
                value={url ?? ""}
                readOnly
                placeholder="Nach Erstellung oder Reset verfügbar"
                onFocus={(event) => {
                    if (visible) event.target.select()
                }}
                autoComplete="off"
                spellCheck={false}
            />
            <div className="actions">
                <button className="button" disabled={!url || busy} onClick={() => void copy()}>
                    {copied ? "Kopiert ✓" : "Kopieren"}
                </button>
                <button
                    className="button"
                    disabled={!url || busy}
                    aria-controls="obs-link"
                    aria-expanded={visible}
                    onClick={() => setVisible(!visible)}
                >
                    {visible ? "Verbergen" : "Anzeigen"}
                </button>
                <button
                    className="button"
                    disabled={busy || confirmReset}
                    onClick={() => {
                        setVisible(false)
                        setConfirmReset(true)
                    }}
                >
                    Zurücksetzen
                </button>
            </div>
            {confirmReset && (
                <div className="overlay-link-confirm" role="group" aria-label="OBS-Link zurücksetzen bestätigen">
                    <p>Der bisherige Link wird ungültig. Zurücksetzen?</p>
                    <button className="button" disabled={busy} onClick={() => setConfirmReset(false)}>
                        Abbrechen
                    </button>
                    <button className="button primary" disabled={busy} onClick={onReset}>
                        {busy ? "Wird zurückgesetzt …" : "Ja, zurücksetzen"}
                    </button>
                </div>
            )}
        </section>
    )
}
