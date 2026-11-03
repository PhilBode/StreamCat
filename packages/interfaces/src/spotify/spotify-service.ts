import {CurrentlyPlayingInfo} from "./song-details"
import {QueueResult} from "./queue-details"
import {SpotifyInstanceToken} from "./spotify-token"

export interface ISpotifyService {
    hasGuildInstance(guildId: string): boolean

    getCurrentlyPlaying(guildId: string): Promise<CurrentlyPlayingInfo | null>

    removeGuildInstance(guildId: string): void

    replaceGuildInstance(guildId: string, token: SpotifyInstanceToken): void

    tryToAddSongToQueue(content: string, guildId: string): Promise<QueueResult>

    init(): Promise<void>
}
