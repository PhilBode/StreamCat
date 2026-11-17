"use client"

import {useEffect, useState} from "react"
import type {DashboardGuild} from "@streamcat/interfaces"
import {apiRequest} from "../../lib/api"
import {ButtonLink} from "../ui/button"
import {ProfileAvatar} from "./profile-avatar"
import "./servers.css"

export function Servers() {
    const [guilds, setGuilds] = useState<DashboardGuild[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const abort = new AbortController()
        void apiRequest<DashboardGuild[]>(
            "/dashboard/guilds",
            {signal: abort.signal},
            "Die Server konnten nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) setGuilds(data)
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Die Server konnten nicht geladen werden.")
            })
        return () => abort.abort()
    }, [])

    const loading = !guilds && !error

    return (
        <div className="servers">
            <div className="servers-heading">
                <h1>Meine Server</h1>
                <p>Wähle einen Server, den du besitzt oder als Administrator verwaltest.</p>
            </div>
            <div className="servers-divider" aria-hidden="true" />
            <div className="servers-meta">
                <span>Verbinde dich mit Discord, um deine Server zu sehen.</span>
                {!loading && guilds && <span>{guilds.length} SERVER</span>}
            </div>

            {loading && (
                <div className="servers-grid" role="status" aria-label="Server werden geladen">
                    {[0, 1, 2].map((index) => (
                        <div className="server-card server-card-skeleton" key={index} aria-hidden="true" />
                    ))}
                </div>
            )}

            {error && (
                <div className="servers-state" role="alert">
                    <p>{error}</p>
                    <div className="servers-state-actions">
                        <ButtonLink typeVariant="primary" href="/dashboard">
                            Erneut versuchen
                        </ButtonLink>
                        <ButtonLink typeVariant="secondary" href="/api/backend/dashboard/auth/login">
                            Mit Discord anmelden
                        </ButtonLink>
                    </div>
                </div>
            )}

            {guilds && guilds.length === 0 && !error && (
                <div className="servers-state">
                    <h2>Keine administrierbaren Server</h2>
                    <p>Hier erscheinen die Server, die du besitzt oder auf denen du Administrator bist.</p>
                </div>
            )}

            {guilds && guilds.length > 0 && (
                <ul className="servers-grid">
                    {guilds.map((guild) => (
                        <li className="server-card" key={guild.id}>
                            <div className="server-card-identity">
                                <ProfileAvatar
                                    name={guild.name}
                                    src={
                                        guild.icon
                                            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                                            : null
                                    }
                                />
                                <div className="server-card-text">
                                    <span className="server-card-name">{guild.name}</span>
                                    <span className="server-card-status">
                                        <span
                                            className={`server-card-dot ${guild.botPresent ? "" : "server-card-dot--missing"}`}
                                            aria-hidden="true"
                                        />
                                        {guild.botPresent ? "Bot beigetreten" : "Bot noch nicht eingeladen"}
                                    </span>
                                </div>
                            </div>
                            <div className="server-card-footer">
                                {guild.botPresent ? (
                                    <ButtonLink typeVariant="secondary" href={`/dashboard/${guild.id}`}>
                                        Server öffnen
                                    </ButtonLink>
                                ) : (
                                    <ButtonLink
                                        typeVariant="primary"
                                        href={guild.inviteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Bot einladen
                                    </ButtonLink>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
