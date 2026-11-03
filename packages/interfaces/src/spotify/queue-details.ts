export type QueueResult =
    | {success: false}
    | {
          success: true
          url?: string | null
          name: string
          artists: string[]
      }

export interface SpotifyQueuedTrack {
    uri: string
    name: string
    artists: string[]
    coverUrl: string | null
}

export interface SpotifyQueue {
    connected: boolean
    tracks: SpotifyQueuedTrack[]
}
