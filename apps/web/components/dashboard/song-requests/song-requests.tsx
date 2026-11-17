"use client"

import {useEffect, useRef, useState} from "react"
import type {SongRequestReward, SongRequestSettings, SongRequestUpdate, SpotifyQueue} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../../lib/api"
import {Accordion} from "../../ui/accordion"
import {Checkbox} from "../../ui/checkbox"
import {Dropdown} from "../../ui/dropdown"
import {Switch} from "../../ui/switch"
import {useTemporaryMessage} from "../use-temporary-message"
import {ProfileAvatar} from "../profile-avatar"
import "./song-requests.css"

const QUEUE_REFRESH_MS = 15_000

export function SongRequests({guildId}: {guildId: string}) {
    const [settings, setSettings] = useState<SongRequestSettings | null>(null)
    const [rewards, setRewards] = useState<SongRequestReward[]>([])
    const [pending, setPending] = useState(false)
    const [error, setError] = useTemporaryMessage()
    const lifetime = useRef<AbortController | null>(null)
    const path = `/dashboard/guilds/${encodeURIComponent(guildId)}/song-requests`

    useEffect(() => {
        const abort = new AbortController()
        lifetime.current = abort
        void apiRequest<SongRequestSettings>(
            path,
            {signal: abort.signal},
            "Song Requests konnten nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) setSettings(data)
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Song Requests konnten nicht geladen werden.")
            })
        return () => abort.abort()
    }, [path, setError])

    useEffect(() => {
        if (!settings?.channelId) return
        const abort = new AbortController()
        void apiRequest<SongRequestReward[]>(
            `${path}/rewards`,
            {signal: abort.signal},
            "Twitch-Belohnungen konnten nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) setRewards(data)
            })
            .catch(() => {
                
            })
        return () => abort.abort()
    }, [path, settings?.channelId])

    async function save(update: SongRequestUpdate) {
        const abort = lifetime.current
        if (!settings?.channelId || pending || !abort || abort.signal.aborted) return
        const previous = settings
        setSettings({...settings, ...update})
        setPending(true)
        setError(null)
        try {
            const data = await apiRequest<SongRequestSettings>(
                path,
                postJson(update, abort.signal),
                "Song Requests konnten nicht gespeichert werden."
            )
            if (!abort.signal.aborted) setSettings(data)
        } catch (cause) {
            if (!abort.signal.aborted) {
                setSettings(previous)
                setError(cause instanceof Error ? cause.message : "Song Requests konnten nicht gespeichert werden.")
            }
        } finally {
            if (!abort.signal.aborted) setPending(false)
        }
    }

    const canConfigure = !!settings?.channelId && settings.assigned && !pending
    const loading = !settings && !error
    const selectedRewardId = settings?.rewardIds[0] ?? null

    return (
        <section className="panel song-requests" aria-busy={pending}>
            <div className="song-requests-heading">
                <div className="song-requests-title">
                    <span className="song-requests-title-text">Song Requests</span>
                    <span className="song-requests-subtitle">Musikwünsche über Twitch-Chat und Kanalpunkte.</span>
                </div>
                {loading ? (
                    <span className="song-requests-master" role="status">
                        Wird geladen …
                    </span>
                ) : (
                    <div className="song-requests-master">
                        <span className="song-requests-master-label" role="status">
                            {settings?.enabled ? "Aktiv" : "Pausiert"}
                        </span>
                        <Switch
                            checked={settings?.enabled ?? false}
                            label="Song Requests"
                            disabled={pending || !settings?.channelId}
                            onChange={(enabled) => void save({enabled})}
                        />
                    </div>
                )}
            </div>
            <div className="panel-rule" aria-hidden="true" />
            {loading ? (
                <div
                    className="song-requests-skeleton"
                    role="status"
                    aria-label="Song-Request-Einstellungen werden geladen"
                />
            ) : (
                <>
                    {settings && !settings.channelId && (
                        <p className="song-requests-hint">Verbinde zuerst ein Twitch-Konto mit diesem Server.</p>
                    )}
                    {settings?.channelId && !settings.assigned && (
                        <p className="song-requests-hint">
                            Dieser Server ist noch nicht für Song Requests in diesem Twitch-Kanal zuständig.
                        </p>
                    )}
                    {error && (
                        <p className="song-requests-hint song-requests-hint--error" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="song-requests-controls">
                        <Dropdown
                            label="Kanalpunkte-Belohnung"
                            value={selectedRewardId}
                            options={rewards.map((reward) => ({
                                value: reward.id,
                                label: `${reward.title} · ${reward.cost} Punkte`
                            }))}
                            disabled={!canConfigure}
                            onChange={(rewardId) => void save({rewardIds: [rewardId]})}
                        />
                        <Checkbox
                            checked={settings?.chatCommandEnabled ?? false}
                            disabled={!canConfigure}
                            onChange={(event) => void save({chatCommandEnabled: event.target.checked})}
                        >
                            Songs per !sr annehmen
                        </Checkbox>
                    </div>
                    <div className="panel-rule" aria-hidden="true" />
                    {settings?.channelId && <QueueAccordion guildId={guildId} />}
                </>
            )}
        </section>
    )
}

function QueueAccordion({guildId}: {guildId: string}) {
    return (
        <Accordion label="Spotify-Queue">
            <QueueContents guildId={guildId} />
        </Accordion>
    )
}

function QueueContents({guildId}: {guildId: string}) {
    const [queue, setQueue] = useState<SpotifyQueue | null>(null)
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
    const [error, setError] = useTemporaryMessage()
    const lastLoadedAt = useRef(0)

    useEffect(() => {
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
    }, [guildId, setError])

    if (status === "loading" && !queue) {
        return (
            <div className="song-queue-skeleton" role="status" aria-label="Spotify-Queue wird geladen">
                {[0, 1, 2].map((index) => (
                    <div className="song-queue-row song-queue-row-skeleton" key={index} aria-hidden="true" />
                ))}
            </div>
        )
    }
    return (
        <div className="song-queue">
            {error && (
                <p className="song-requests-hint song-requests-hint--error" role="alert">
                    {error}
                </p>
            )}
            {status === "ready" && !queue?.connected && (
                <p className="song-requests-hint">Verbinde zuerst Spotify mit diesem Server.</p>
            )}
            {status === "ready" && queue?.connected && !queue.tracks.length && (
                <p className="song-requests-hint">Die Queue ist leer.</p>
            )}
            {status !== "error" && !!queue?.tracks.length && (
                <ol className="song-queue-list" aria-label="Nächste Songs">
                    {queue.tracks.map((track, index) => (
                        <li className="song-queue-row" key={`${index}-${track.uri}`}>
                            <span className="song-queue-index">{String(index + 1).padStart(2, "0")}</span>
                            <ProfileAvatar src={track.coverUrl} name={track.name} />
                            <div className="song-queue-text">
                                <span className="song-queue-title">{track.name}</span>
                                <span className="song-queue-artist">{track.artists.join(", ")}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
