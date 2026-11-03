"use client"

import "./dashboard.css"
import {apiRequest} from "../../lib/api"
import Link from "next/link"
import {useCallback, useEffect, useState} from "react"
import type {DashboardGuild, DashboardGuildDetails, DashboardUser} from "@streamcat/interfaces"
import {Connections} from "./connections"
import {Skeleton} from "../ui/skeleton"
import {DashboardSkeleton} from "./dashboard-skeleton"
import {ProfileAvatar} from "./profile-avatar"
import {FollowedStreamers} from "./twitch/followed-streamers"

async function load<T>(path: string, signal: AbortSignal): Promise<T> {
    return apiRequest<T>(`/dashboard/${path}`, {signal}, "Das Dashboard ist momentan nicht erreichbar.")
}

function GuildIcon({guild}: {guild: DashboardGuild}) {
    return (
        <ProfileAvatar
            name={guild.name}
            src={guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null}
        />
    )
}

export function Dashboard({guildId}: {guildId?: string}) {
    const [user, setUser] = useState<DashboardUser | null>(null)
    const [guilds, setGuilds] = useState<DashboardGuild[]>([])
    const [guild, setGuild] = useState<DashboardGuildDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [revision, setRevision] = useState(0)
    const refresh = useCallback(() => {
        setLoading(true)
        setError(null)
        setGuild(null)
        setGuilds([])
        setUser(null)
        setRevision((value) => value + 1)
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        async function fetchDashboard() {
            try {
                const me = await load<DashboardUser>("me", controller.signal)
                if (guildId) {
                    const details = await load<DashboardGuildDetails>(
                        `guilds/${encodeURIComponent(guildId)}`,
                        controller.signal
                    )
                    setGuild(details)
                } else {
                    setGuilds(await load<DashboardGuild[]>("guilds", controller.signal))
                }
                setUser(me)
            } catch (cause) {
                if (!controller.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Das Dashboard konnte nicht geladen werden.")
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }
        void fetchDashboard()
        return () => controller.abort()
    }, [guildId, revision])

    return (
        <section className="dashboard">
            <div className="page-heading">
                <div>
                    <p className="terminal-caption">Discord / {guildId ? "Server" : "Workspace"}</p>
                    <h1 aria-label={loading && guildId ? "Serverübersicht" : undefined}>
                        {loading && guildId ? (
                            <Skeleton className="skeleton-title" />
                        ) : (
                            guild?.name || (guildId ? "Serverübersicht" : "Meine Server")
                        )}
                    </h1>
                    {user ? (
                        <div className="dashboard-user">
                            <ProfileAvatar
                                name={user.name}
                                src={
                                    user.avatar
                                        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
                                        : null
                                }
                            />
                            <div>
                                <p className="muted">Angemeldet als</p>
                                <span>{user.name}</span>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="dashboard-user" role="status" aria-label="Benutzerprofil wird geladen">
                            <Skeleton className="skeleton-avatar" />
                            <div className="skeleton-stack skeleton-user-name">
                                <Skeleton className="skeleton-caption" />
                                <Skeleton className="skeleton-text" />
                            </div>
                        </div>
                    ) : (
                        <p className="muted">Für Serverbesitzer und Administratoren</p>
                    )}
                </div>
                <div className="actions">
                    <button className="button" onClick={refresh} disabled={loading}>
                        Aktualisieren
                    </button>
                    {loading && <Skeleton className="skeleton-button" />}
                    {user && (
                        <form action="/api/backend/dashboard/auth/logout" method="post">
                            <button className="button">Abmelden</button>
                        </form>
                    )}
                </div>
            </div>

            {loading && <DashboardSkeleton guildView={!!guildId} />}
            {error && (
                <div role="alert" className="panel error">
                    <p>{error}</p>
                    <div className="actions">
                        <a className="button primary" href="/api/backend/dashboard/auth/login">
                            Mit Discord anmelden
                        </a>
                        <button className="button" onClick={refresh}>
                            Erneut versuchen
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && guild && (
                <>
                    <Link className="back-link" href="/dashboard">
                        Alle Server
                    </Link>
                    <div className="guild-summary">
                        <div className="guild-overview">
                            <div className="guild-header">
                                <GuildIcon guild={guild} />
                                <div>
                                    <h2>Dein Serverzugriff</h2>
                                    <p className="muted">{guild.owner ? "Serverbesitzer" : "Administrator"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="stats">
                            <div className="panel stat-card">
                                <p className="muted">Mitglieder</p>
                                <strong>{guild.memberCount.toLocaleString("de-DE")}</strong>
                            </div>
                            <div className="panel stat-card">
                                <p className="muted">Discord-Bot</p>
                                <strong className={guild.botReady ? "active" : ""}>
                                    {guild.botReady ? "Online" : "Nicht verbunden"}
                                </strong>
                            </div>
                        </div>
                    </div>
                    <Connections key={`${guild.id}-${revision}`} guildId={guild.id} />
                    <FollowedStreamers key={`streamers-${guild.id}-${revision}`} guildId={guild.id} />
                    <section className="panel overlay-dashboard-link">
                        <div>
                            <h2>Stream-Overlay</h2>
                            <p className="muted">Szenen mit Widgets, Chat, Bildern und Videos gestalten</p>
                        </div>
                        <Link className="button primary" href={`/dashboard/${guild.id}/overlay`}>
                            Overlay bearbeiten
                        </Link>
                    </section>
                </>
            )}

            {!loading && !error && !guildId && (
                <>
                    <div className="guild-list-heading">
                        <p className="muted">Wähle deinen Server oder lade StreamCat ein</p>
                        <span className="muted">{guilds.length} Server</span>
                    </div>
                    {guilds.length === 0 && (
                        <div className="panel">
                            <h2>Keine administrierbaren Server</h2>
                            <p className="muted">
                                Hier erscheinen die Server, die du besitzt oder auf denen du Administrator bist.
                            </p>
                        </div>
                    )}
                    <div className="guild-grid">
                        {guilds.map((item, index) => (
                            <article className="panel guild-card" key={item.id}>
                                <span className="guild-number" aria-hidden="true">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="guild-header">
                                    <GuildIcon guild={item} />
                                    <div>
                                        <h2>{item.name}</h2>
                                        <p className={item.botPresent ? "active" : "muted"}>
                                            {item.botPresent ? "Bot beigetreten" : "Bot noch nicht eingeladen"}
                                        </p>
                                    </div>
                                </div>
                                {item.botPresent ? (
                                    <Link className="button" href={`/dashboard/${item.id}`}>
                                        Server öffnen
                                    </Link>
                                ) : (
                                    <a
                                        className="button"
                                        href={item.inviteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Bot einladen
                                    </a>
                                )}
                            </article>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
