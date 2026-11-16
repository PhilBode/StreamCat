"use client"

import {useEffect, useState, type FormEvent} from "react"
import type {FollowedTwitchStreamer} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../../lib/api"
import {Accordion} from "../../ui/accordion"
import {Button} from "../../ui/button"
import {IconButton} from "../../ui/button"
import {CloseIcon} from "../../icons"
import {TextInput} from "../../ui/text-input"
import {ProfileAvatar} from "../profile-avatar"
import {useTemporaryMessage} from "../use-temporary-message"
import "./followed-streamers.css"

export function FollowedStreamers({guildId}: {guildId: string}) {
    return (
        <section className="panel followed-streamers">
            <div className="followed-streamers-heading">
                <div className="followed-streamers-title">
                    <span className="followed-streamers-title-text">Gefolgte Kanäle</span>
                    <span className="followed-streamers-subtitle">Live-Benachrichtigungen für diesen Server.</span>
                </div>
            </div>
            <div className="panel-rule" aria-hidden="true" />
            <FollowedStreamerList guildId={guildId} />
        </section>
    )
}

function FollowedStreamerList({guildId}: {guildId: string}) {
    const [streamers, setStreamers] = useState<FollowedTwitchStreamer[] | null>(null)
    const [username, setUsername] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useTemporaryMessage()
    const path = `/dashboard/guilds/${encodeURIComponent(guildId)}/twitch/streamers`

    useEffect(() => {
        const abort = new AbortController()
        void apiRequest<FollowedTwitchStreamer[]>(path, {signal: abort.signal}, "Kanäle konnten nicht geladen werden.")
            .then((data) => {
                if (!abort.signal.aborted) setStreamers(data)
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Kanäle konnten nicht geladen werden.")
            })
        return () => abort.abort()
    }, [path, setError])

    async function add(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (saving) return
        setSaving(true)
        setError(null)
        try {
            const created = await apiRequest<FollowedTwitchStreamer>(
                path,
                postJson({username: username.trim().toLowerCase()}),
                "Der Kanal konnte nicht hinzugefügt werden."
            )
            setStreamers((current) => {
                const next = (current ?? []).filter((item) => item.channelId !== created.channelId)
                return [...next, created]
            })
            setUsername("")
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Der Kanal konnte nicht hinzugefügt werden.")
        } finally {
            setSaving(false)
        }
    }

    async function remove(channelId: string) {
        setError(null)
        const previous = streamers
        setStreamers((current) => (current ?? []).filter((item) => item.channelId !== channelId))
        try {
            await apiRequest(
                `${path}/${encodeURIComponent(channelId)}`,
                {method: "DELETE"},
                "Der Kanal konnte nicht entfernt werden."
            )
        } catch (cause) {
            setStreamers(previous)
            setError(cause instanceof Error ? cause.message : "Der Kanal konnte nicht entfernt werden.")
        }
    }

    const loading = !streamers && !error

    return (
        <>
            <form className="followed-streamers-form" onSubmit={add}>
                <TextInput
                    label="Twitch-Benutzername"
                    placeholder="twitch_username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    pattern="[a-zA-Z0-9_]{1,25}"
                    maxLength={25}
                    autoComplete="off"
                    disabled={loading || saving}
                />
                <Button type="submit" disabled={loading || saving}>
                    Kanal hinzufügen
                </Button>
            </form>
            {error && (
                <p className="followed-streamers-hint followed-streamers-hint--error" role="alert">
                    {error}
                </p>
            )}
            <div className="panel-rule" aria-hidden="true" />
            {loading ? (
                <div className="followed-streamers-skeleton" role="status" aria-label="Kanäle werden geladen" />
            ) : (
                <Accordion label={`Gefolgte Kanäle · ${streamers?.length ?? 0}`}>
                    <div className="followed-streamers-list">
                        {streamers && streamers.length === 0 && (
                            <p className="followed-streamers-hint">Noch keine Kanäle gefolgt.</p>
                        )}
                        {streamers?.map((streamer) => (
                            <div className="followed-streamers-row" key={streamer.channelId}>
                                <ProfileAvatar src={streamer.profilePictureUrl} name={streamer.displayName} />
                                <div className="followed-streamers-text">
                                    <span className="followed-streamers-name">
                                        {streamer.mainStream ? `${streamer.displayName} · LIVE` : streamer.displayName}
                                    </span>
                                    <span className="followed-streamers-handle">@{streamer.username}</span>
                                </div>
                                <IconButton
                                    typeVariant="secondary"
                                    label={`@${streamer.username} entfolgen`}
                                    icon={<CloseIcon />}
                                    onClick={() => void remove(streamer.channelId)}
                                />
                            </div>
                        ))}
                    </div>
                </Accordion>
            )}
        </>
    )
}
