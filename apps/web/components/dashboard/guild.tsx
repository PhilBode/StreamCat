"use client"

import Link from "next/link"
import {useEffect, useState} from "react"
import type {
    DashboardConnections,
    DashboardGuildDetails,
    FollowedTwitchStreamer,
    SongRequestReward,
    SongRequestSettings,
    SpotifyPlaybackState
} from "@streamcat/interfaces"
import {apiRequest} from "../../lib/api"
import {ButtonLink} from "../ui/button"
import {Skeleton} from "../ui/skeleton"
import {ProfileAvatar} from "./profile-avatar"
import {Connections} from "./connections"
import {FollowedStreamers} from "./twitch/followed-streamers"
import {SongRequests} from "./song-requests/song-requests"
import "./guild.css"

type LoadResult<T> = {data: T | null; error: string | null}

export function Guild({
    guildId,
    oauthResult,
    spotifyRedirectUri
}: {
    guildId: string
    oauthResult: string | null
    spotifyRedirectUri: string | null
}) {
    const [guild, setGuild] = useState<DashboardGuildDetails | null>(null)
    const [connections, setConnections] = useState<DashboardConnections | null>(null)
    const [connectionsError, setConnectionsError] = useState<string | null>(null)
    const [songRequests, setSongRequests] = useState<SongRequestSettings | null>(null)
    const [songRequestsError, setSongRequestsError] = useState<string | null>(null)
    const [rewards, setRewards] = useState<SongRequestReward[]>([])
    const [rewardsError, setRewardsError] = useState<string | null>(null)
    const [streamers, setStreamers] = useState<FollowedTwitchStreamer[]>([])
    const [streamersError, setStreamersError] = useState<string | null>(null)
    const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [revealed, setRevealed] = useState(false)

    useEffect(() => {
        if (loading || error) return
        const frame = requestAnimationFrame(() => setRevealed(true))
        return () => cancelAnimationFrame(frame)
    }, [loading, error])

    useEffect(() => {
        const abort = new AbortController()

        async function request<T>(path: string, fallback: string): Promise<LoadResult<T>> {
            try {
                const data = await apiRequest<T>(path, {signal: abort.signal}, fallback)
                return {data, error: null}
            } catch (cause) {
                if (abort.signal.aborted) return {data: null, error: null}
                return {data: null, error: cause instanceof Error ? cause.message : fallback}
            }
        }

        async function load() {
            const path = `/dashboard/guilds/${encodeURIComponent(guildId)}`
            const [guildResult, connectionsResult, songResult, streamersResult] = await Promise.all([
                request<DashboardGuildDetails>(path, "Der Server konnte nicht geladen werden."),
                request<DashboardConnections>(`${path}/connections`, "Konten konnten nicht geladen werden."),
                request<SongRequestSettings>(`${path}/song-requests`, "Song Requests konnten nicht geladen werden."),
                request<FollowedTwitchStreamer[]>(`${path}/twitch/streamers`, "Kanäle konnten nicht geladen werden.")
            ])
            if (abort.signal.aborted) return

            const [rewardsResult, playbackResult] = await Promise.all([
                songResult.data?.channelId
                    ? request<SongRequestReward[]>(
                          `${path}/song-requests/rewards`,
                          "Twitch-Belohnungen konnten nicht geladen werden."
                      )
                    : Promise.resolve({data: [], error: null} as LoadResult<SongRequestReward[]>),
                connectionsResult.data?.spotify
                    ? request<{playback: SpotifyPlaybackState}>(`${path}/overlay/preview`, "")
                    : Promise.resolve({data: null, error: null} as LoadResult<{playback: SpotifyPlaybackState}>)
            ])
            if (abort.signal.aborted) return

            setGuild(guildResult.data)
            setError(guildResult.error)
            setConnections(connectionsResult.data)
            setConnectionsError(connectionsResult.error)
            setSongRequests(songResult.data)
            setSongRequestsError(songResult.error)
            setRewards(rewardsResult.data ?? [])
            setRewardsError(rewardsResult.error)
            setStreamers(streamersResult.data ?? [])
            setStreamersError(streamersResult.error)
            setPlayback(playbackResult.data?.playback ?? null)
            setLoading(false)
        }

        void load()
        return () => abort.abort()
    }, [guildId])

    return (
        <div className="guild">
            <Link className="guild-back" href="/dashboard">
                ← Alle Server
            </Link>
            {error && !loading && (
                <div className="guild-state" role="alert">
                    <p>{error}</p>
                    <ButtonLink typeVariant="primary" href={`/dashboard/${guildId}`}>
                        Erneut versuchen
                    </ButtonLink>
                </div>
            )}
            {!error && (loading || guild) && (
                <div className="guild-body">
                    <GuildSkeleton leaving={!loading} />
                    {guild && (
                        <div className={revealed ? "guild-content guild-content--visible" : "guild-content"}>
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
                            <Connections
                                guildId={guild.id}
                                initialConnections={connections}
                                initialError={connectionsError}
                                initialPlayback={playback}
                                oauthResult={oauthResult}
                                spotifyRedirectUri={spotifyRedirectUri}
                            />
                            <div className="guild-row">
                                <SongRequests
                                    guildId={guild.id}
                                    initialSettings={songRequests}
                                    initialSettingsError={songRequestsError}
                                    initialRewards={rewards}
                                    initialRewardsError={rewardsError}
                                    connections={connectionsError ? undefined : connections}
                                />
                                <FollowedStreamers
                                    guildId={guild.id}
                                    initialStreamers={streamers}
                                    initialError={streamersError}
                                    ownChannel={connectionsError ? undefined : (connections?.twitch?.username ?? null)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function GuildSkeleton({leaving}: {leaving: boolean}) {
    return (
        <div
            className={`guild-skeleton${leaving ? " guild-skeleton--leaving" : ""}`}
            role="status"
            aria-label="Server-Einstellungen werden geladen"
            aria-hidden={leaving || undefined}
        >
            <div className="guild-header">
                <Skeleton className="guild-caption-skeleton" />
                <div className="guild-heading-row">
                    <div className="guild-identity">
                        <Skeleton className="guild-avatar-skeleton" />
                        <div className="guild-identity-text">
                            <Skeleton className="guild-name-skeleton" />
                            <Skeleton className="guild-meta-skeleton" />
                        </div>
                    </div>
                    <Skeleton className="guild-action-skeleton" />
                </div>
            </div>

            <div className="connections">
                {[0, 1].map((index) => (
                    <div className="panel connection-card connection-card-skeleton" key={index}>
                        <div className="connection-heading">
                            <div className="connection-identity">
                                <Skeleton className="connection-avatar-skeleton" />
                                <div className="connection-identity-text">
                                    <Skeleton className="connection-title-skeleton" />
                                    <Skeleton className="connection-subtitle-skeleton" />
                                </div>
                            </div>
                            <Skeleton className="connection-pill-skeleton" />
                        </div>
                        <div className="panel-rule" />
                        <div className="connection-body">
                            <Skeleton className="connection-line-skeleton connection-line-skeleton--wide" />
                            <Skeleton className="connection-line-skeleton" />
                        </div>
                        <div className="connection-footer">
                            <Skeleton className="connection-button-skeleton" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="guild-row">
                {[0, 1].map((index) => (
                    <div className="panel guild-panel-skeleton" key={index}>
                        <div className="guild-panel-heading">
                            <div className="guild-panel-title">
                                <Skeleton className="guild-panel-title-skeleton" />
                                <Skeleton className="guild-panel-subtitle-skeleton" />
                            </div>
                            <Skeleton className="guild-panel-control-skeleton" />
                        </div>
                        <div className="panel-rule" />
                        <div className="guild-panel-lines">
                            <Skeleton className="guild-panel-line-skeleton" />
                            <Skeleton className="guild-panel-line-skeleton guild-panel-line-skeleton--short" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
