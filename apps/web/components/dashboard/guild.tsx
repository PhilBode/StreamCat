"use client"

import Link from "next/link"
import {useEffect, useState} from "react"
import type {DashboardGuildDetails} from "@streamcat/interfaces"
import {apiRequest} from "../../lib/api"
import {ButtonLink} from "../ui/button"
import {ProfileAvatar} from "./profile-avatar"
import {Connections} from "./connections"
import {FollowedStreamers} from "./twitch/followed-streamers"
import {SongRequests} from "./song-requests/song-requests"
import "./guild.css"

export function Guild({guildId}: {guildId: string}) {
    const [guild, setGuild] = useState<DashboardGuildDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const abort = new AbortController()
        void apiRequest<DashboardGuildDetails>(
            `/dashboard/guilds/${encodeURIComponent(guildId)}`,
            {signal: abort.signal},
            "Der Server konnte nicht geladen werden."
        )
            .then((data) => {
                if (!abort.signal.aborted) setGuild(data)
            })
            .catch((cause) => {
                if (!abort.signal.aborted)
                    setError(cause instanceof Error ? cause.message : "Der Server konnte nicht geladen werden.")
            })
            .finally(() => {
                if (!abort.signal.aborted) setLoading(false)
            })
        return () => abort.abort()
    }, [guildId])

    return (
        <div className="guild">
            <Link className="guild-back" href="/dashboard">
                ← Alle Server
            </Link>
            {error && (
                <div className="guild-state" role="alert">
                    <p>{error}</p>
                    <ButtonLink typeVariant="primary" href={`/dashboard/${guildId}`}>
                        Erneut versuchen
                    </ButtonLink>
                </div>
            )}
            {loading && !error && (
                <div className="guild-header" role="status" aria-label="Server wird geladen">
                    <span className="guild-caption">Server-Einstellungen</span>
                    <div className="guild-heading-row">
                        <div className="guild-identity">
                            <span className="guild-avatar guild-avatar-skeleton" aria-hidden="true" />
                            <div className="guild-identity-text">
                                <span className="guild-name guild-name-skeleton">Servername</span>
                                <span className="guild-meta">wird geladen …</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {guild && !error && (
                <>
                    <div className="guild-header">
                        <span className="guild-caption">Server-Einstellungen</span>
                        <div className="guild-heading-row">
                            <div className="guild-identity">
                                <ProfileAvatar
                                    name={guild.name}
                                    src={
                                        guild.icon
                                            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                                            : null
                                    }
                                />
                                <div className="guild-identity-text">
                                    <h1 className="guild-name">{guild.name}</h1>
                                    <span className="guild-meta">
                                        {guild.owner ? "Serverbesitzer" : "Administrator"} ·{" "}
                                        {guild.memberCount.toLocaleString("de-DE")} Mitglieder
                                    </span>
                                </div>
                            </div>
                            <ButtonLink typeVariant="primary" href={`/dashboard/${guild.id}/overlay`}>
                                Overlay bearbeiten
                            </ButtonLink>
                        </div>
                    </div>
                    <Connections guildId={guild.id} />
                    <div className="guild-row">
                        <SongRequests guildId={guild.id} />
                        <FollowedStreamers guildId={guild.id} />
                    </div>
                </>
            )}
        </div>
    )
}
