declare module "spotify-web-api-node" {
    interface Credentials {
        clientId?: string
        clientSecret?: string
        accessToken?: string
        refreshToken?: string
        redirectUri?: string
    }

    interface Response<T> {
        body: T
        headers: Record<string, string>
        statusCode: number
    }

    interface ArtistRef {
        name: string
    }

    interface PlaybackItem {
        name: string
        duration_ms?: number
        artists: ArtistRef[]
        album?: {images?: Array<{url: string}>}
    }

    interface PlaybackState {
        item?: PlaybackItem | null
        is_playing?: boolean
        progress_ms?: number | null
    }

    interface SearchTrack {
        id: string
        name: string
        uri: string
        artists: ArtistRef[]
    }

    interface SearchResult {
        tracks?: {items: SearchTrack[]}
    }

    interface SpotifyTrack {
        uri: string
        name: string
        artists: ArtistRef[]
    }

    class SpotifyWebApi {
        constructor(credentials?: Credentials)

        setAccessToken(token: string): void

        setRefreshToken(token: string): void

        setClientId(clientId: string): void

        setClientSecret(clientSecret: string): void

        getRefreshToken(): string | null

        getAccessToken(): string | null

        getMyCurrentPlaybackState(): Promise<Response<PlaybackState | null>>

        refreshAccessToken(): Promise<Response<{access_token: string; expires_in: number}>>

        search(query: string, types: string[], options?: {limit?: number}): Promise<Response<SearchResult>>

        addToQueue(uri: string): Promise<Response<unknown>>

        getTrack(id: string): Promise<Response<SpotifyTrack>>

        authorizationCodeGrant(code: string): Promise<
            Response<{
                access_token: string
                refresh_token: string
                expires_in: number
                scope: string
            }>
        >

        getMe(): Promise<Response<{id: string; display_name: string; images?: Array<{url: string}>}>>
    }

    export default SpotifyWebApi
}
