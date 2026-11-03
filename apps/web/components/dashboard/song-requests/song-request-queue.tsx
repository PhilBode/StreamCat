"use client"

import {useEffect, useRef, useState} from "react"
import type {SpotifyQueue} from "@streamcat/interfaces"
import {apiRequest} from "../../../lib/api"
import {SkeletonList} from "../../ui/skeleton"
import {ProfileAvatar} from "../profile-avatar"
import {useTemporaryMessage} from "../use-temporary-message"
import "./song-request-queue.css"

const QUEUE_REFRESH_MS = 15_000

export function SongRequestQueue({guildId}: {guildId: string}) {
    const [open, setOpen] = useState(false)
    const [hasOpened, setHasOpened] = useState(false)

    return (
        <details
            className="song-request-queue"
            onToggle={(event) => {
                const expanded = event.currentTarget.open
                setOpen(expanded)
                if (expanded) setHasOpened(true)
            }}
        >
            <summary>Spotify-Queue</summary>
            {hasOpened && <QueueContents key={guildId} guildId={guildId} open={open} />}
        </details>
    )
}

function QueueContents({guildId, open}: {guildId: string; open: boolean}) {
    const [queue, setQueue] = useState<SpotifyQueue | null>(null)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [error, setError] = useTemporaryMessage()
    const [revision, setRevision] = useState(0)
    const lastLoadedAt = useRef(0)

    useEffect(() => {
        if (!open) return
        const abort = new AbortController()
        let timeout: ReturnType<typeof setTimeout> | undefined

        async function load() {
            try {
                const next = await apiRequest<SpotifyQueue>(
                    `/dashboard/guilds/${encodeURIComponent(guildId)}/song-requests/queue`,
                    {signal: abort.signal},
                    "Die Spotify-Queue konnte nicht geladen werden."
                )
                if (abort.signal.aborted) return
                setQueue(next)
                lastLoadedAt.current = Date.now()
                setStatus("ready")
                setError(null)
                if (next.connected) timeout = setTimeout(() => void load(), QUEUE_REFRESH_MS)
            } catch (cause) {
                if (abort.signal.aborted) return
                setStatus("error")
                setError(cause instanceof Error ? cause.message : "Die Spotify-Queue konnte nicht geladen werden.")
            }
        }

        const remaining = QUEUE_REFRESH_MS - (Date.now() - lastLoadedAt.current)
        if (remaining <= 0) void load()
        else timeout = setTimeout(() => void load(), remaining)
        return () => {
            abort.abort()
            clearTimeout(timeout)
        }
    }, [guildId, open, revision, setError])

    function refresh() {
        lastLoadedAt.current = 0
        setStatus("loading")
        setError(null)
        setRevision((current) => current + 1)
    }

    return (
        <div className="song-request-queue-content">
            <div className="song-request-queue-heading">
                <p className="muted" role="status">
                    {status === "loading"
                        ? "Als Nächstes in Spotify"
                        : status === "error"
                          ? "Queue derzeit nicht verfügbar."
                          : "Als Nächstes in Spotify"}
                </p>
                <button className="button" onClick={refresh} disabled={status === "loading"}>
                    Aktualisieren
                </button>
            </div>
            {status === "loading" && !queue && (
                <SkeletonList label="Spotify-Queue wird geladen" className="skeleton-list-compact" />
            )}
            {error && (
                <p className="notice error" role="alert">
                    {error}
                </p>
            )}
            {status === "ready" && !queue?.connected && (
                <p className="muted">Verbinde zuerst Spotify mit diesem Server.</p>
            )}
            {status === "ready" && queue?.connected && !queue.tracks.length && (
                <p className="muted">Die Queue ist leer.</p>
            )}
            {status !== "error" && !!queue?.tracks.length && (
                <ol className="song-request-queue-tracks" aria-label="Nächste Songs">
                    {queue.tracks.map((track, index) => (
                        <li key={`${index}-${track.uri}`}>
                            <span className="muted">{index + 1}</span>
                            <ProfileAvatar src={track.coverUrl} name={track.name} />
                            <div>
                                <strong>{track.name}</strong>
                                <span className="muted">{track.artists.join(", ")}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
