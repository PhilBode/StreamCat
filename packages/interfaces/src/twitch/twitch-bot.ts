import {TwitchLiveInfo, TwitchStreamData} from "./twitch-data"

export interface ITwitchBot {
    subscribeToStreamer(streamerName: string): Promise<void>

    unsubscribeFromStreamer(twitchUserId: string): Promise<void>

    addGuildAuth(
        guildId: string,
        userId: string,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
    ): Promise<void>

    removeGuildAuth(guildId: string): Promise<void>

    resolveUserId(username: string): Promise<string>

    fetchStreamData(username: string): Promise<TwitchStreamData>

    getLiveStreams(userIds: string[]): Promise<TwitchLiveInfo[]>
}
