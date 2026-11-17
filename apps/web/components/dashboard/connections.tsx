"use client"

import {useEffect, useState, type FormEvent} from "react"
import type {DashboardConnections, SpotifyPlaybackState} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../lib/api"
import {Accordion} from "../ui/accordion"
import {Button} from "../ui/button"
import {StatusPill} from "../ui/status-pill"
import {TextInput} from "../ui/text-input"
import {ProfileAvatar} from "./profile-avatar"
import "./connections.css"

const SONG_POLL_MS = 15_000

export function Connections({guildId}: {guildId: string}) {
    const [connections, setConnections] = useState<DashboardConnections | null>(null)
    const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null)
    const [clientId, setClientId] = useState("")
    const [secret, setSecret] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const path = `/dashboard/guilds/${encodeURIComponent(guildId)}`

    useEffect(() => {
        const abort = new AbortController()
        const query = new URLSearchParams(window.location.search)
        void apiRequest<DashboardConnections>(
            `${path}/connections`,
            {signal: abort.signal},
            "Konten konnten nicht geladen werden."
        )
            .then((data) => {
                if (abort.signal.aborted) return
                setConnections(data)
                setClientId(data.spotify?.clientId || "")
                if (query.get("result") === "success") setNotice("Das Konto wurde für diesen Server verknüpft.")
                if (query.get("result") === "failed")
                    setError("Die Verknüpfung ist fehlgeschlagen. Bitte starte sie erneut.")
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Konten konnten nicht geladen werden.")
            })
        return () => abort.abort()
    }, [path])

    useEffect(() => {
        if (!connections?.spotify) return
        const abort = new AbortController()
        let timeout: ReturnType<typeof setTimeout> | undefined
        async function poll() {
            try {
                const data = await apiRequest<{playback: SpotifyPlaybackState}>(
                    `${path}/overlay/preview`,
                    {signal: abort.signal},
                    ""
                )
                if (!abort.signal.aborted) setPlayback(data.playback)
            } catch {
                
            }
            if (!abort.signal.aborted) timeout = setTimeout(() => void poll(), SONG_POLL_MS)
        }
        void poll()
        return () => {
            abort.abort()
            clearTimeout(timeout)
        }
    }, [path, connections?.spotify])

    async function connect(provider: "twitch" | "spotify") {
        setBusy(true)
        setError(null)
        try {
            const data = await apiRequest<{url: string}>(
                `${path}/connections/${provider}`,
                postJson(provider === "spotify" ? {clientId, clientSecret: secret} : {}),
                "Die Anmeldung konnte nicht gestartet werden."
            )
            setSecret("")
            window.location.assign(data.url)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Die Anmeldung konnte nicht gestartet werden.")
            setBusy(false)
        }
    }

    async function unlink(provider: "twitch" | "spotify") {
        setBusy(true)
        setError(null)
        try {
            await apiRequest(
                `${path}/connections/${provider}`,
                {method: "DELETE"},
                "Die Verbindung konnte nicht aufgehoben werden."
            )
            setConnections((current) => (current ? {...current, [provider]: null} : current))
            if (provider === "spotify") setPlayback(null)
            setNotice("Die Verbindung wurde aufgehoben.")
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Die Verbindung konnte nicht aufgehoben werden.")
        } finally {
            setBusy(false)
        }
    }

    function spotifySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        void connect("spotify")
    }

    const loading = !connections && !error
    const song = playback?.status === "playing" || playback?.status === "paused" ? playback.text : null

    return (
        <div
            className="connections"
            role={loading ? "status" : undefined}
            aria-label={loading ? "Verbundene Konten werden geladen" : undefined}
        >
            {loading ? (
                <>
                    <div className="panel connection-card connection-card-skeleton" aria-hidden="true" />
                    <div className="panel connection-card connection-card-skeleton" aria-hidden="true" />
                </>
            ) : (
                <>
                    {notice && (
                        <p className="connections-note" role="status">
                            {notice}
                        </p>
                    )}
                    {error && (
                        <div className="connections-note connections-note--error" role="alert">
                            <strong>Verbindungen konnten nicht aktualisiert werden</strong>
                            <p>{error}</p>
                        </div>
                    )}
                    <ConnectionCard
                        provider="twitch"
                        title="Twitch"
                        subtitle="Dein Streaming-Konto"
                        connected={!!connections?.twitch}
                        avatarSrc={connections?.twitch ? `/api/backend${path}/connections/twitch/avatar` : null}
                        accountName={connections?.twitch?.username}
                        description={
                            connections?.twitch
                                ? "Dieses Konto ist für deinen Server gespeichert."
                                : "Verbinde dein Konto, um Song Requests, Stream-Benachrichtigungen und Overlays auf diesem Server zu nutzen."
                        }
                        connectLabel="Twitch verbinden"
                        busy={busy}
                        onConnect={() => void connect("twitch")}
                        onUnlink={() => void unlink("twitch")}
                        song={null}
                    />
                    <ConnectionCard
                        provider="spotify"
                        title="Spotify"
                        subtitle="Musik & Song Requests"
                        connected={!!connections?.spotify}
                        avatarSrc={connections?.spotify ? `/api/backend${path}/connections/spotify/avatar` : null}
                        accountName={connections?.spotify?.username}
                        description={
                            connections?.spotify
                                ? "Verwende die Zugangsdaten deiner eigenen Spotify-App."
                                : "Verbinde dein Konto, um Song Requests und den aktuellen Song im Overlay zu nutzen."
                        }
                        connectLabel="Spotify verbinden"
                        busy={busy}
                        onConnect={() => void connect("spotify")}
                        onUnlink={() => void unlink("spotify")}
                        song={song}
                    >
                        {connections && !connections.spotify && (
                            <Accordion label="Zugangsdaten">
                                <form onSubmit={spotifySubmit} className="connection-form">
                                    <TextInput
                                        label="Client-ID"
                                        placeholder="Client-ID deiner Spotify-App"
                                        value={clientId}
                                        onChange={(event) => setClientId(event.target.value)}
                                        required
                                        pattern="[a-fA-F0-9]{32}"
                                        maxLength={32}
                                        autoComplete="off"
                                        disabled={busy}
                                    />
                                    <TextInput
                                        label="Client Secret"
                                        secret
                                        placeholder="Client Secret deiner Spotify-App"
                                        value={secret}
                                        onChange={(event) => setSecret(event.target.value)}
                                        required
                                        minLength={16}
                                        maxLength={64}
                                        autoComplete="new-password"
                                        disabled={busy}
                                    />
                                    <Button type="submit" disabled={busy}>
                                        {busy ? "Anmeldung startet …" : "Spotify verbinden"}
                                    </Button>
                                </form>
                            </Accordion>
                        )}
                    </ConnectionCard>
                </>
            )}
        </div>
    )
}

type ConnectionCardProps = {
    provider: "twitch" | "spotify"
    title: string
    subtitle: string
    connected: boolean
    avatarSrc: string | null
    accountName?: string
    description: string
    connectLabel: string
    busy: boolean
    onConnect: () => void
    onUnlink: () => void
    song: string | null
    children?: React.ReactNode
}

function ConnectionCard({
    provider,
    title,
    subtitle,
    connected,
    avatarSrc,
    accountName,
    description,
    connectLabel,
    busy,
    onConnect,
    onUnlink,
    song,
    children
}: ConnectionCardProps) {
    return (
        <section className="panel connection-card">
            <div className="connection-heading">
                <div className="connection-identity">
                    <ProfileAvatar src={avatarSrc} name={title} />
                    <div className="connection-identity-text">
                        <span className="connection-title">{title}</span>
                        <span className="connection-subtitle">{subtitle}</span>
                    </div>
                </div>
                <StatusPill state={connected ? "connected" : "neutral"}>{connected ? "Verknüpft" : "Offen"}</StatusPill>
            </div>
            <div className="panel-rule" aria-hidden="true" />
            {connected ? (
                <div className="connection-stats">
                    <div className="connection-stat">
                        <span className="connection-stat-label">Konto</span>
                        <span className="connection-stat-value">{accountName ? `@${accountName}` : "Konto"}</span>
                    </div>
                    {song !== null && (
                        <div className="connection-stat connection-stat--fill">
                            <span className="connection-stat-label">Song</span>
                            <span className="connection-stat-value">{song}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="connection-body">
                    <span className="connection-account">Noch kein Konto</span>
                    <p className="connection-description">{description}</p>
                </div>
            )}
            {children}
            <div className="connection-footer">
                {connected ? (
                    <Button typeVariant="danger" disabled={busy} onClick={onUnlink}>
                        Verbindung aufheben
                    </Button>
                ) : (
                    provider !== "spotify" && (
                        <Button typeVariant="primary" disabled={busy} onClick={onConnect}>
                            {busy ? "Anmeldung startet …" : connectLabel}
                        </Button>
                    )
                )}
            </div>
        </section>
    )
}
