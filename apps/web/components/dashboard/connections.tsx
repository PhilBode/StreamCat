"use client"

import {useEffect, useState, type FormEvent} from "react"
import type {DashboardConnections, SpotifyPlaybackState} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../lib/api"
import {Button} from "../ui/button"
import {Dialog} from "../ui/dialog"
import {StatusPill} from "../ui/status-pill"
import {TextInput} from "../ui/text-input"
import {ProfileAvatar} from "./profile-avatar"
import "./connections.css"

const SONG_POLL_MS = 15_000

type ConnectionsProps = {
    guildId: string
    initialConnections?: DashboardConnections | null
    initialError?: string | null
    initialPlayback?: SpotifyPlaybackState | null
    oauthResult?: string | null
    oauthFailureReason?: string | null
    spotifyRedirectUri?: string | null
    onConnectionsChange?: (connections: DashboardConnections) => void
}

export function Connections({
    guildId,
    initialConnections,
    initialError,
    initialPlayback,
    oauthResult,
    oauthFailureReason,
    spotifyRedirectUri,
    onConnectionsChange
}: ConnectionsProps) {
    const hasInitial = initialConnections !== undefined
    const [connections, setConnections] = useState<DashboardConnections | null>(initialConnections ?? null)
    const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(initialPlayback ?? null)
    const [clientId, setClientId] = useState(initialConnections?.spotify?.clientId ?? "")
    const [secret, setSecret] = useState("")
    const [busy, setBusy] = useState(false)
    const [unlinkTarget, setUnlinkTarget] = useState<"twitch" | "spotify" | null>(null)
    const [error, setError] = useState<string | null>(
        initialError ??
            (oauthResult === "failed"
                ? oauthFailureReason === "account_already_linked"
                    ? "Dieses Twitch-Konto ist bereits mit einem anderen Server verknüpft."
                    : "Die Verknüpfung ist fehlgeschlagen. Bitte starte sie erneut."
                : null)
    )
    const [notice, setNotice] = useState<string | null>(
        oauthResult === "success" ? "Das Konto wurde für diesen Server verknüpft." : null
    )
    const path = `/dashboard/guilds/${encodeURIComponent(guildId)}`

    useEffect(() => {
        if (hasInitial) return
        const abort = new AbortController()
        void apiRequest<DashboardConnections>(
            `${path}/connections`,
            {signal: abort.signal},
            "Konten konnten nicht geladen werden."
        )
            .then((data) => {
                if (abort.signal.aborted) return
                setConnections(data)
                setClientId(data.spotify?.clientId || "")
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Konten konnten nicht geladen werden.")
            })
        return () => abort.abort()
    }, [path, hasInitial])

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
            } catch {}
            if (!abort.signal.aborted) timeout = setTimeout(() => void poll(), SONG_POLL_MS)
        }
        if (initialPlayback === undefined) void poll()
        else timeout = setTimeout(() => void poll(), SONG_POLL_MS)
        return () => {
            abort.abort()
            clearTimeout(timeout)
        }
    }, [path, connections?.spotify, initialPlayback])

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

    async function unlink(provider: "twitch" | "spotify"): Promise<boolean> {
        setBusy(true)
        setError(null)
        try {
            const result = await apiRequest<{success: boolean}>(
                `${path}/connections/${provider}`,
                {method: "DELETE"},
                "Die Verbindung konnte nicht aufgehoben werden."
            )
            const next = connections ? {...connections, [provider]: null} : null
            if (next) {
                setConnections(next)
                onConnectionsChange?.(next)
            }
            if (provider === "spotify") setPlayback(null)
            setNotice(result.success ? "Die Verbindung wurde aufgehoben." : "Die Verbindung war bereits aufgehoben.")
            return true
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Die Verbindung konnte nicht aufgehoben werden.")
            return false
        } finally {
            setBusy(false)
        }
    }

    function requestUnlink(provider: "twitch" | "spotify") {
        setError(null)
        setUnlinkTarget(provider)
    }

    async function confirmUnlink() {
        if (!unlinkTarget || busy) return
        const success = await unlink(unlinkTarget)
        if (success) setUnlinkTarget(null)
    }

    function spotifySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        void connect("spotify")
    }

    const loading = !hasInitial && !connections && !error
    const unavailable = !connections && !!error
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
                            {unavailable && (
                                <Button typeVariant="secondary" onClick={() => window.location.reload()}>
                                    Erneut versuchen
                                </Button>
                            )}
                        </div>
                    )}
                    {!unavailable && (
                        <>
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
                                onUnlink={() => requestUnlink("twitch")}
                                song={null}
                            />
                            <ConnectionCard
                                provider="spotify"
                                title="Spotify"
                                subtitle="Musik & Song Requests"
                                connected={!!connections?.spotify}
                                avatarSrc={
                                    connections?.spotify ? `/api/backend${path}/connections/spotify/avatar` : null
                                }
                                accountName={connections?.spotify?.username}
                                description="Verwende die Zugangsdaten deiner eigenen Spotify-App."
                                connectLabel="Spotify verbinden"
                                busy={busy}
                                onConnect={() => void connect("spotify")}
                                onUnlink={() => requestUnlink("spotify")}
                                song={song}
                            >
                                {connections && !connections.spotify && (
                                    <>
                                        <details className="spotify-tutorial">
                                            <summary className="spotify-tutorial-summary">
                                                <span className="spotify-tutorial-chevron" aria-hidden="true">
                                                    ›
                                                </span>
                                                So bekommst du Client-ID & Secret
                                            </summary>
                                            <div className="spotify-steps">
                                                <p>Hinweis: Ein Spotify Premium-Konto wird benötigt.</p>
                                                <p>
                                                    1. Spotify Dashboard öffnen:{" "}
                                                    <a
                                                        href="https://developer.spotify.com/dashboard"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        developer.spotify.com/dashboard
                                                    </a>
                                                </p>
                                                <p>2. „Create app“ klicken – Name und Beschreibung eintragen</p>
                                                <p>
                                                    3. „Edit Settings“ – Redirect URI hinzufügen:{" "}
                                                    {spotifyRedirectUri ?? "https://deine-public-url/callback/spotify"}
                                                </p>
                                                <p>4. Client-ID und Client-Secret eingeben</p>
                                            </div>
                                        </details>
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
                                            <div className="connection-form-actions">
                                                <Button type="submit" disabled={busy}>
                                                    {busy ? "Anmeldung startet …" : "Spotify verbinden"}
                                                </Button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </ConnectionCard>
                        </>
                    )}
                </>
            )}

            {unlinkTarget && (
                <Dialog
                    title="Verbindung aufheben?"
                    closeLabel="Dialog schließen"
                    onClose={busy ? undefined : () => setUnlinkTarget(null)}
                    footer={
                        <>
                            <Button typeVariant="secondary" disabled={busy} onClick={() => setUnlinkTarget(null)}>
                                Abbrechen
                            </Button>
                            <Button typeVariant="danger" disabled={busy} onClick={() => void confirmUnlink()}>
                                {busy ? "Wird aufgehoben …" : "Aufheben"}
                            </Button>
                        </>
                    }
                >
                    <p className="connection-dialog-text">
                        Das Konto wird vom Service getrennt und alle Daten dazu werden gelöscht.
                    </p>
                    {error && (
                        <p className="connection-dialog-error" role="alert">
                            {error}
                        </p>
                    )}
                </Dialog>
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
            {(connected || provider !== "spotify") && (
                <div className="connection-footer">
                    {connected ? (
                        <Button typeVariant="danger" disabled={busy} onClick={onUnlink}>
                            Verbindung aufheben
                        </Button>
                    ) : (
                        <Button typeVariant="primary" disabled={busy} onClick={onConnect}>
                            {busy ? "Anmeldung startet …" : connectLabel}
                        </Button>
                    )}
                </div>
            )}
        </section>
    )
}
