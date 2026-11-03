"use client"

import {useEffect, useState, type FormEvent} from "react"
import type {DashboardConnections} from "@streamcat/interfaces"
import {apiRequest, postJson} from "../../lib/api"
import {SongRequests} from "./song-requests/song-requests"
import {ConnectionSkeleton} from "./dashboard-skeleton"
import {ProfileAvatar} from "./profile-avatar"

export function Connections({guildId}: {guildId: string}) {
    const [connections, setConnections] = useState<DashboardConnections | null>(null)
    const [clientId, setClientId] = useState("")
    const [secret, setSecret] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    useEffect(() => {
        const abort = new AbortController()
        const query = new URLSearchParams(window.location.search)
        void apiRequest<DashboardConnections>(
            `/dashboard/guilds/${encodeURIComponent(guildId)}/connections`,
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
    }, [guildId])

    async function connect(provider: "twitch" | "spotify") {
        setBusy(true)
        setError(null)
        try {
            const data = await apiRequest<{url: string}>(
                `/dashboard/guilds/${encodeURIComponent(guildId)}/connections/${provider}`,
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

    function spotifySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        void connect("spotify")
    }

    const loading = !connections && !error

    function status(connected: boolean) {
        const label = connections ? (connected ? "Verknüpft" : "Nicht eingerichtet") : "Nicht verfügbar"
        return <span className={`status-pill ${connected ? "connected" : "neutral"}`}>{label}</span>
    }

    function accountName(username?: string) {
        if (!connections) return "Status unbekannt"
        return username || "Noch kein Konto"
    }

    return (
        <section className="connections" aria-labelledby="connections-title">
            <div className="section-heading">
                <div>
                    <h2 id="connections-title">Verbundene Konten</h2>
                    <p className="muted">Deine Twitch- und Spotify-Verbindung für diesen Server</p>
                </div>
            </div>
            {notice && (
                <p className="notice success" role="status">
                    {notice}
                </p>
            )}
            {error && (
                <div className="notice error" role="alert">
                    <strong>Verbindungen konnten nicht aktualisiert werden</strong>
                    <p>{error}</p>
                </div>
            )}
            <div
                className="connection-grid"
                role={loading ? "status" : undefined}
                aria-label={loading ? "Verbundene Konten werden geladen" : undefined}
            >
                {loading ? (
                    <>
                        <ConnectionSkeleton />
                        <ConnectionSkeleton />
                    </>
                ) : (
                    <>
                        <section className="panel connection-card">
                            <div className="connection-heading">
                                <ProfileAvatar
                                    src={
                                        connections?.twitch
                                            ? `/api/backend/dashboard/guilds/${encodeURIComponent(guildId)}/connections/twitch/avatar`
                                            : null
                                    }
                                    name={connections?.twitch?.username || "Twitch"}
                                />
                                <div>
                                    <h3>Twitch</h3>
                                    <p className="muted">Dein Streaming-Konto</p>
                                </div>
                                {status(!!connections?.twitch)}
                            </div>
                            <div className="account-summary">
                                <p className="field-caption">Verknüpftes Konto</p>
                                <strong>{accountName(connections?.twitch?.username)}</strong>
                                <p className="muted">
                                    {connections?.twitch
                                        ? "Dieses Konto ist für deinen Server gespeichert."
                                        : "Verbinde dein Konto für Twitch-Funktionen auf diesem Server."}
                                </p>
                            </div>
                            <div className="connection-footer">
                                <button
                                    className="button twitch-button"
                                    disabled={busy || !connections}
                                    onClick={() => void connect("twitch")}
                                >
                                    {busy
                                        ? "Anmeldung startet …"
                                        : connections?.twitch
                                          ? "Neu verbinden"
                                          : "Twitch verbinden"}
                                </button>
                            </div>
                        </section>
                        <section className="panel connection-card">
                            <div className="connection-heading">
                                <ProfileAvatar
                                    src={
                                        connections?.spotify
                                            ? `/api/backend/dashboard/guilds/${encodeURIComponent(guildId)}/connections/spotify/avatar`
                                            : null
                                    }
                                    name={connections?.spotify?.username || "Spotify"}
                                />
                                <div>
                                    <h3>Spotify</h3>
                                    <p className="muted">Musik & Song Requests</p>
                                </div>
                                {status(!!connections?.spotify)}
                            </div>
                            <div className="account-summary">
                                <p className="field-caption">Verknüpftes Konto</p>
                                <strong>{accountName(connections?.spotify?.username)}</strong>
                                <p className="muted">Verwende die Zugangsdaten deiner eigenen Spotify-App.</p>
                            </div>
                            <details className="spotify-settings" open={connections ? !connections.spotify : false}>
                                <summary>
                                    {connections?.spotify ? "Zugangsdaten & erneut verbinden" : "Spotify einrichten"}
                                </summary>
                                <form onSubmit={spotifySubmit} className="connection-form">
                                    <label htmlFor="spotify-client-id">Client-ID</label>
                                    <input
                                        id="spotify-client-id"
                                        placeholder="Client-ID deiner Spotify-App"
                                        value={clientId}
                                        onChange={(event) => setClientId(event.target.value)}
                                        required
                                        pattern="[a-fA-F0-9]{32}"
                                        maxLength={32}
                                        autoComplete="off"
                                        disabled={busy || !connections}
                                    />
                                    <label htmlFor="spotify-client-secret">Client Secret</label>
                                    <input
                                        id="spotify-client-secret"
                                        type="password"
                                        placeholder={
                                            connections?.spotify
                                                ? "Gespeichertes Secret verwenden"
                                                : "Client Secret deiner Spotify-App"
                                        }
                                        value={secret}
                                        onChange={(event) => setSecret(event.target.value)}
                                        required={!connections?.spotify}
                                        minLength={16}
                                        maxLength={64}
                                        autoComplete="new-password"
                                        disabled={busy || !connections}
                                    />
                                    {connections?.spotify && (
                                        <p className="muted form-hint">
                                            Bei gleicher Client-ID kannst du das Secret leer lassen.
                                        </p>
                                    )}
                                    <button className="button primary" disabled={busy || !connections} type="submit">
                                        {busy
                                            ? "Anmeldung startet …"
                                            : connections?.spotify
                                              ? "Spotify neu verbinden"
                                              : "Spotify verbinden"}
                                    </button>
                                </form>
                            </details>
                        </section>
                    </>
                )}
            </div>
            <p className="connection-note">
                Verknüpft zeigt ein gespeichertes Konto. Der aktuelle Sessionstatus wird hier noch nicht geprüft.
            </p>
            <SongRequests guildId={guildId} />
        </section>
    )
}
