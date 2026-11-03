"use client"

import {useEffect, useRef, useState, type FormEvent} from "react"
import type {FollowedTwitchStreamer} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../../lib/api"
import {SkeletonList} from "../../ui/skeleton"
import {ProfileAvatar} from "../profile-avatar"
import {useTemporaryMessage} from "../use-temporary-message"
import "./followed-streamers.css"

export function FollowedStreamers({guildId}: {guildId: string}) {
    const [hasOpened, setHasOpened] = useState(false)
    return (
        <details
            className="followed-streamers"
            aria-labelledby="followed-streamers-title"
            onToggle={(event) => {
                if (event.currentTarget.open) setHasOpened(true)
            }}
        >
            <summary className="followed-streamers-heading">
                <h2 id="followed-streamers-title">
                    Gefolgte Twitch-Kanäle
                    <span className="muted followed-streamers-description">
                        Live-Benachrichtigungen für diesen Discord-Server
                    </span>
                </h2>
            </summary>
            {hasOpened && <FollowedStreamerList key={guildId} guildId={guildId} />}
        </details>
    )
}

function FollowedStreamerList({guildId}: {guildId: string}) {
    const [streamers, setStreamers] = useState<FollowedTwitchStreamer[]>([])
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useTemporaryMessage()
    const [loadFailed, setLoadFailed] = useState(false)
    const [formError, setFormError] = useTemporaryMessage()
    const [notice, setNotice] = useTemporaryMessage()
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [revision, setRevision] = useState(0)
    const lifetime = useRef<AbortController | null>(null)
    const path = `/dashboard/guilds/${encodeURIComponent(guildId)}/twitch/streamers`

    useEffect(() => {
        const abort = new AbortController()
        lifetime.current = abort
        void apiRequest<FollowedTwitchStreamer[]>(
            path,
            {signal: abort.signal},
            "Twitch-Kanäle konnten nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) {
                    setStreamers(data)
                    setLoadFailed(false)
                }
            })
            .catch((error) => {
                if (!abort.signal.aborted) {
                    setLoadFailed(true)
                    setLoadError(error instanceof Error ? error.message : "Twitch-Kanäle konnten nicht geladen werden.")
                }
            })
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false)
            })
        return () => abort.abort()
    }, [path, revision, setLoadError])

    function refresh() {
        setLoading(true)
        setLoadError(null)
        setRevision((value) => value + 1)
    }

    async function follow(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const abort = lifetime.current
        if (loading || saving || !abort || abort.signal.aborted) return
        setSaving(true)
        setFormError(null)
        setNotice(null)
        try {
            const added = await apiRequest<FollowedTwitchStreamer>(
                path,
                postJson({username: username.trim()}, abort.signal),
                "Der Twitch-Kanal konnte nicht hinzugefügt werden."
            )
            if (abort.signal.aborted) return
            const alreadyFollowed = streamers.some((streamer) => streamer.channelId === added.channelId)
            setStreamers((current) =>
                alreadyFollowed
                    ? current.map((streamer) => (streamer.channelId === added.channelId ? added : streamer))
                    : [...current, added]
            )
            setUsername("")
            setNotice(
                alreadyFollowed
                    ? `${added.displayName} ist bereits in deiner Liste.`
                    : `${added.displayName} wurde hinzugefügt.`
            )
        } catch (error) {
            if (!abort.signal.aborted)
                setFormError(
                    error instanceof Error ? error.message : "Der Twitch-Kanal konnte nicht hinzugefügt werden."
                )
        } finally {
            if (!abort.signal.aborted) setSaving(false)
        }
    }

    async function unfollow(streamer: FollowedTwitchStreamer) {
        const abort = lifetime.current
        if (loading || saving || !abort || abort.signal.aborted) return
        setSaving(true)
        setRemovingId(streamer.channelId)
        setFormError(null)
        setNotice(null)
        try {
            await apiRequest(
                `${path}/${encodeURIComponent(streamer.channelId)}`,
                {
                    method: "DELETE",
                    signal: abort.signal
                },
                "Der Follow konnte nicht entfernt werden."
            )
            if (abort.signal.aborted) return
            setStreamers((current) => current.filter((saved) => saved.channelId !== streamer.channelId))
            setNotice(`${streamer.displayName} wurde entfernt.`)
        } catch (error) {
            if (!abort.signal.aborted)
                setFormError(error instanceof Error ? error.message : "Der Follow konnte nicht entfernt werden.")
        } finally {
            if (!abort.signal.aborted) {
                setSaving(false)
                setRemovingId(null)
            }
        }
    }

    return (
        <div className="followed-streamers-content">
            <button className="button streamer-refresh" onClick={refresh} disabled={loading || saving}>
                Aktualisieren
            </button>
            <form className="streamer-follow-form" onSubmit={(event) => void follow(event)}>
                <div>
                    <label htmlFor="twitch-follow-username">Twitch-Benutzername</label>
                    <input
                        id="twitch-follow-username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="twitch_username"
                        required
                        pattern="[A-Za-z0-9_]{1,25}"
                        maxLength={25}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        disabled={loading || saving}
                    />
                </div>
                <button className="button primary" type="submit" disabled={loading || saving}>
                    {saving && !removingId ? "Wird hinzugefügt …" : "Kanal hinzufügen"}
                </button>
            </form>
            {formError && (
                <p className="notice error" role="alert">
                    {formError}
                </p>
            )}
            {notice && (
                <p className="streamer-follow-notice" role="status">
                    {notice}
                </p>
            )}
            {loading && !streamers.length && <SkeletonList label="Twitch-Kanäle werden geladen" />}
            {!loading && loadFailed && !loadError && (
                <p className="muted">Twitch-Kanäle derzeit nicht verfügbar. Bitte erneut aktualisieren.</p>
            )}
            {loadError && (
                <p className="notice error" role="alert">
                    {loadError}
                </p>
            )}
            {!loading && !loadFailed && !streamers.length && (
                <p className="muted">Noch keine Twitch-Kanäle hinzugefügt.</p>
            )}
            {streamers.length > 0 && (
                <ul className="followed-streamer-list" aria-label="Gefolgte Kanäle">
                    {streamers.map((streamer) => (
                        <li key={streamer.channelId || streamer.username}>
                            <ProfileAvatar src={streamer.profilePictureUrl} name={streamer.displayName} />
                            <div className="followed-streamer-name">
                                <a
                                    href={`https://www.twitch.tv/${encodeURIComponent(streamer.username)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {streamer.displayName}
                                </a>
                                <span className="muted">@{streamer.username}</span>
                            </div>
                            {streamer.mainStream ? (
                                <span className="status-pill neutral">Eigenes Konto</span>
                            ) : (
                                <button
                                    type="button"
                                    className="button streamer-unfollow"
                                    aria-label={`Follow für ${streamer.displayName} entfernen`}
                                    title="Follow entfernen"
                                    disabled={loading || saving}
                                    onClick={() => void unfollow(streamer)}
                                >
                                    <span aria-hidden="true">{removingId === streamer.channelId ? "…" : "×"}</span>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
