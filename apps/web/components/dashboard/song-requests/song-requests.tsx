"use client"

import {useEffect, useRef, useState} from "react"
import type {SongRequestSettings, SongRequestUpdate} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../../lib/api"
import {Skeleton} from "../../ui/skeleton"
import {SongRequestRewards} from "./reward-picker"
import {SongRequestQueue} from "./song-request-queue"
import {useTemporaryMessage} from "../use-temporary-message"

export function SongRequests({guildId}: {guildId: string}) {
    const [settings, setSettings] = useState<SongRequestSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [rewardRevision, setRewardRevision] = useState(0)
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
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false)
            })
        return () => abort.abort()
    }, [path, setError])

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

    return (
        <section className="panel song-requests" aria-labelledby="song-requests-title" aria-busy={loading}>
            <div className="section-heading song-request-heading">
                <div>
                    <h2 id="song-requests-title">Song Requests</h2>
                    <p className="muted">Musikwünsche über Twitch-Chat und Kanalpunkte.</p>
                </div>
                {loading ? (
                    <Skeleton className="skeleton-heading" />
                ) : (
                    <div className="song-request-master">
                        <span className="muted" role="status">
                            {settings
                                ? settings.enabled
                                    ? "Aktiv"
                                    : "Pausiert"
                                : loading
                                  ? "Wird geladen …"
                                  : "Nicht verfügbar"}
                        </span>
                        <button
                            type="button"
                            className="song-request-switch"
                            role="switch"
                            aria-checked={settings?.enabled ?? false}
                            aria-label="Song Requests"
                            disabled={pending || !settings?.channelId}
                            onClick={() => void save({enabled: !settings?.enabled})}
                        >
                            <span aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
            {loading ? (
                <SongRequestSettingsSkeleton />
            ) : (
                <>
                    {settings && !settings.channelId && (
                        <p className="muted">Verbinde zuerst ein Twitch-Konto mit diesem Server.</p>
                    )}
                    {settings?.channelId && !settings.assigned && (
                        <p className="muted">
                            Dieser Server ist noch nicht für Song Requests in diesem Twitch-Kanal zuständig.
                        </p>
                    )}
                    {error && (
                        <p className="notice error" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="song-request-toggle">
                        <div>
                            <strong>
                                Chat-Befehl <code>!sr</code>
                            </strong>
                            <p className="muted">Songs direkt per Chat anfordern.</p>
                        </div>
                        <button
                            type="button"
                            className="song-request-switch"
                            role="switch"
                            aria-checked={settings?.chatCommandEnabled ?? false}
                            aria-label="Chat-Befehl !sr"
                            disabled={!canConfigure}
                            onClick={() => void save({chatCommandEnabled: !settings?.chatCommandEnabled})}
                        >
                            <span aria-hidden="true" />
                        </button>
                    </div>
                    {settings?.channelId && (
                        <SongRequestRewards
                            key={rewardRevision}
                            path={path}
                            selectedIds={settings.rewardIds}
                            disabled={!canConfigure}
                            onRefresh={() => setRewardRevision((value) => value + 1)}
                            onChange={(rewardIds) => void save({rewardIds})}
                        />
                    )}
                    <p className="muted song-request-footer" role="status">
                        {pending
                            ? "Wird gespeichert …"
                            : settings?.enabled === false
                              ? "Chat und Kanalpunkte pausiert. Songs in der Queue laufen weiter."
                              : "Änderungen werden automatisch gespeichert. Songs in der Queue laufen weiter."}
                    </p>
                    <SongRequestQueue guildId={guildId} />
                </>
            )}
        </section>
    )
}

function SongRequestSettingsSkeleton() {
    return (
        <div
            className="song-request-settings-skeleton"
            role="status"
            aria-label="Song-Request-Einstellungen werden geladen"
        >
            <div className="skeleton-stack">
                <Skeleton className="skeleton-heading" />
                <Skeleton className="skeleton-text" />
            </div>
            <div className="song-request-rewards skeleton-stack">
                <Skeleton className="skeleton-caption" />
                <Skeleton className="skeleton-control" />
                <Skeleton className="skeleton-text" />
            </div>
            <div className="song-request-footer">
                <Skeleton className="skeleton-text" />
            </div>
        </div>
    )
}
