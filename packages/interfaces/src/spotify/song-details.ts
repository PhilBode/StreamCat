export interface CurrentlyPlayingInfo {
    text: string
    albumUrl: string | null
}

export interface SpotifyPlaybackState {
    status: "playing" | "paused" | "idle" | "disconnected" | "error"
    text: string
    albumUrl: string | null
    name?: string
    artist?: string
    progressMs?: number | null
    durationMs?: number | null
    sampledAt?: number
}
