"use client"

import {Skeleton} from "../../ui/skeleton"
import {apiRequest} from "../../../lib/api"
import {useEffect, useState} from "react"
import type {SongRequestReward} from "@streamcat/interfaces"
import {useTemporaryMessage} from "../use-temporary-message"

export function SongRequestRewards({
    path,
    selectedIds,
    disabled,
    onRefresh,
    onChange
}: {
    path: string
    selectedIds: string[]
    disabled: boolean
    onRefresh: () => void
    onChange: (ids: string[]) => void
}) {
    const [rewards, setRewards] = useState<SongRequestReward[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useTemporaryMessage()

    useEffect(() => {
        const abort = new AbortController()
        void apiRequest<SongRequestReward[]>(
            `${path}/rewards`,
            {signal: abort.signal},
            "Twitch-Belohnungen konnten nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) setRewards(data)
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(
                        cause instanceof Error ? cause.message : "Twitch-Belohnungen konnten nicht geladen werden."
                    )
            })
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false)
            })
        return () => abort.abort()
    }, [path, setError])

    const missing = selectedIds.filter((id) => !rewards.some((reward) => reward.id === id))
    const options = [
        ...rewards,
        ...missing.map((id) => ({
            id,
            title: loading ? "Belohnung wird geladen …" : "Gespeicherte Belohnung · derzeit nicht verfügbar",
            cost: null
        }))
    ]
    const multiple = selectedIds.length > 1

    return (
        <div className="song-request-rewards">
            <label htmlFor="song-request-reward">Kanalpunkte-Belohnung</label>
            <p className="muted" id="song-request-reward-hint">
                Eine Twitch-Belohnung mit Texteingabe für Song Requests.
            </p>
            <div className="song-request-select">
                {loading ? (
                    <span
                        className="reward-select-skeleton"
                        role="status"
                        aria-label="Twitch-Belohnungen werden geladen"
                    >
                        <Skeleton className="skeleton-control" />
                    </span>
                ) : (
                    <select
                        id="song-request-reward"
                        value={multiple ? "__multiple__" : (selectedIds[0] ?? "")}
                        disabled={disabled || loading}
                        aria-describedby="song-request-reward-hint"
                        aria-busy={loading}
                        onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
                    >
                        <option value="">{loading ? "Belohnungen werden geladen …" : "Keine Belohnung"}</option>
                        {multiple && (
                            <option value="__multiple__" disabled>
                                {selectedIds.length} bisherige Belohnungen verknüpft
                            </option>
                        )}
                        {options.map((reward) => (
                            <option key={reward.id} value={reward.id}>
                                {reward.title}
                                {reward.cost !== null ? ` · ${reward.cost.toLocaleString("de-DE")} Punkte` : ""}
                            </option>
                        ))}
                    </select>
                )}
                <button
                    type="button"
                    className="button song-request-refresh"
                    disabled={loading || disabled}
                    onClick={onRefresh}
                    aria-label="Twitch-Belohnungen aktualisieren"
                    title="Twitch-Belohnungen aktualisieren"
                >
                    ↻
                </button>
            </div>
            {error && (
                <p className="notice error" role="alert">
                    {error}
                </p>
            )}
            {!loading && !error && !options.length && (
                <p className="muted song-request-hint">
                    Keine passende Belohnung gefunden. Erstelle sie zuerst in deinem Twitch-Dashboard.
                </p>
            )}
            {multiple && (
                <p className="muted song-request-hint">
                    Deine bisherigen Zuordnungen bleiben aktiv. Eine neue Auswahl ersetzt sie.
                </p>
            )}
            <p className="muted song-request-hint">Kanalpunkte funktionieren auch bei ausgeschaltetem !sr.</p>
        </div>
    )
}
