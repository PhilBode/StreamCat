import {formatOpenURL, parse} from "spotify-uri"
import SpotifyWebApi from "spotify-web-api-node"
import type {
    CurrentlyPlayingInfo,
    QueueResult,
    SpotifyInstanceToken,
    SpotifyPlaybackState,
    SpotifyQueuedTrack
} from "@streamcat/interfaces"
import {findBestMatch} from "../search/track-scoring"
import {errorDetails, type ModuleLogger} from "@streamcat/core"

type QueueTrack = {name: string; uri: string; artists: Array<{name: string}>}

export function spotifyErrorDetails(error: unknown): string {
    const statusCode = (error as {statusCode?: unknown} | null)?.statusCode
    return `status=${typeof statusCode === "number" ? statusCode : "unknown"} ${errorDetails(error)}`
}

export class GuildSpotifyInstance {
    public readonly logger: ModuleLogger
    private readonly spotifyApi: SpotifyWebApi
    private refreshTimeout?: ReturnType<typeof setTimeout>
    private refreshPromise?: Promise<boolean>
    private disposed = false

    constructor(
        token: SpotifyInstanceToken,
        logger: ModuleLogger,
        private readonly onRefresh: (
            accessToken: string,
            refreshToken: string,
            expiresIn: number,
            isCurrent: () => boolean
        ) => Promise<void>,
        private readonly guildId = "unknown"
    ) {
        this.logger = logger
        this.spotifyApi = new SpotifyWebApi({clientId: token.clientId, clientSecret: token.clientSecret})
        this.applyTokens(token.accessToken, token.refreshToken, token.expiresIn)
    }

    private applyTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
        this.spotifyApi.setAccessToken(accessToken)
        this.spotifyApi.setRefreshToken(refreshToken)
        this.scheduleNextRefresh(expiresIn)
    }

    dispose(): void {
        this.disposed = true
        clearTimeout(this.refreshTimeout)
        this.refreshTimeout = undefined
    }

    async start(): Promise<boolean> {
        if (this.disposed || !this.spotifyApi.getRefreshToken()) {
            return false
        }
        clearTimeout(this.refreshTimeout)
        return this.refreshAccessToken()
    }

    async getCurrentlyPlaying(): Promise<CurrentlyPlayingInfo | null> {
        const state = await this.getPlaybackState()
        return state.status === "playing" || state.status === "paused"
            ? {text: state.text, albumUrl: state.albumUrl}
            : null
    }

    async getProfilePictureUrl(): Promise<string | null> {
        try {
            const profile = await this.spotifyApi.getMe()
            return profile.body.images?.[0]?.url ?? null
        } catch (error) {
            if ((error as {statusCode?: unknown})?.statusCode !== 401 || !(await this.refreshAccessToken())) {
                throw error
            }
            const profile = await this.spotifyApi.getMe()
            return profile.body.images?.[0]?.url ?? null
        }
    }

    async getQueue(): Promise<SpotifyQueuedTrack[]> {
        const request = () =>
            fetch("https://api.spotify.com/v1/me/player/queue", {
                headers: {Authorization: `Bearer ${this.spotifyApi.getAccessToken()}`},
                signal: AbortSignal.timeout(10_000)
            })
        let response = await request()
        if (response.status === 401 && (await this.refreshAccessToken())) response = await request()
        if (response.status === 204) return []
        if (!response.ok) {
            throw Object.assign(new Error("Spotify queue request failed"), {statusCode: response.status})
        }
        const playback = (await response.json()) as {
            queue: Array<{
                type: string
                uri: string
                name: string
                artists: Array<{name: string}>
                album: {images: Array<{url: string}>}
            }>
        }
        if (!Array.isArray(playback.queue)) throw new Error("Spotify returned an invalid queue")
        return playback.queue
            .filter((track) => track.type === "track")
            .map((track) => ({
                uri: track.uri,
                name: track.name,
                artists: track.artists.map((artist) => artist.name),
                coverUrl: track.album?.images?.[0]?.url ?? null
            }))
    }

    async getPlaybackState(): Promise<SpotifyPlaybackState> {
        try {
            return await this.fetchPlaybackState()
        } catch (error) {
            let playbackError = error
            if ((error as {statusCode?: unknown})?.statusCode === 401 && (await this.refreshAccessToken())) {
                try {
                    return await this.fetchPlaybackState()
                } catch (retryError) {
                    playbackError = retryError
                }
            }
            this.logger.error(
                `Failed to get currently playing guild=${this.guildId} ${spotifyErrorDetails(playbackError)}`
            )
            return {status: "error", text: "Spotify ist momentan nicht erreichbar.", albumUrl: null}
        }
    }

    private async fetchPlaybackState(): Promise<SpotifyPlaybackState> {
        const data = await this.spotifyApi.getMyCurrentPlaybackState()
        const track = data.body?.item
        if (!track?.name) return {status: "idle", text: "Gerade läuft kein Song.", albumUrl: null}
        const artistNames = track.artists?.map((artist) => artist.name).join(", ") ?? ""
        const albumUrl = track.album?.images?.[0]?.url ?? null
        return {
            status: data.body?.is_playing === false ? "paused" : "playing",
            text: `${artistNames} - ${track.name}`,
            albumUrl,
            name: track.name,
            artist: artistNames,
            progressMs: data.body?.progress_ms ?? null,
            durationMs: track.duration_ms ?? null,
            sampledAt: Date.now()
        }
    }

    async tryToAddSongToQueue(content: string): Promise<QueueResult> {
        let song: ReturnType<typeof parse> | undefined
        try {
            song = parse(content)
        } catch {
            // A plain text request is resolved through Spotify search.
        }
        try {
            if (song) {
                if (song.type === "track") return await this.queueTrackById(song.id)
                return {success: false}
            }
            const result = await this.spotifyApi.search(content, ["track"], {limit: 10})
            if (!result.body.tracks?.items.length) return {success: false}

            const bestMatch = findBestMatch(content, result.body.tracks.items)
            return await this.enqueueTrack(bestMatch.id, bestMatch)
        } catch (error) {
            this.logger.error(`Failed to queue Spotify song guild=${this.guildId} ${spotifyErrorDetails(error)}`)
            throw new Error(
                "Spotify could not add the song to the queue. Please try again or check that Spotify is playing.",
                {cause: error}
            )
        }
    }

    private scheduleNextRefresh(expiresIn: number) {
        clearTimeout(this.refreshTimeout)
        if (this.disposed) return
        const refreshTime = Math.max(0, (expiresIn - 60) * 1000)
        this.refreshTimeout = setTimeout(async () => {
            await this.refreshAccessToken()
        }, refreshTime)
    }

    private refreshAccessToken(): Promise<boolean> {
        if (this.disposed) return Promise.resolve(false)
        if (!this.refreshPromise) {
            this.refreshPromise = this.performTokenRefresh().finally(() => {
                this.refreshPromise = undefined
            })
        }
        return this.refreshPromise
    }

    private async performTokenRefresh(): Promise<boolean> {
        const refreshToken = this.spotifyApi.getRefreshToken() ?? ""
        const isCurrent = () => !this.disposed
        try {
            const data = await this.spotifyApi.refreshAccessToken()
            if (!isCurrent()) return false
            const accessToken = data.body["access_token"]
            const nextRefreshToken = (data.body as {refresh_token?: string}).refresh_token ?? refreshToken
            const expiresIn = data.body["expires_in"]
            await this.onRefresh(accessToken, nextRefreshToken, expiresIn, isCurrent)
            if (!isCurrent()) return false
            this.applyTokens(accessToken, nextRefreshToken, expiresIn)

            return true
        } catch (err) {
            if (!isCurrent()) return false
            this.logger.error(`Failed to refresh Spotify token guild=${this.guildId} ${spotifyErrorDetails(err)}`)
            this.scheduleNextRefresh(300)
            return false
        }
    }

    private async queueTrackById(trackId: string): Promise<QueueResult> {
        const trackData = await this.spotifyApi.getTrack(trackId)
        return await this.enqueueTrack(trackId, trackData.body)
    }

    private async enqueueTrack(trackId: string, track: QueueTrack): Promise<QueueResult> {
        await this.spotifyApi.addToQueue(`spotify:track:${trackId}`)
        return {
            success: true,
            url: formatOpenURL(track.uri),
            name: track.name,
            artists: track.artists.map((artist) => artist.name)
        }
    }
}
