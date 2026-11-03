import type {TwitchRedemption} from "./twitch-redemption"

export interface TwitchChatMessage {
    channelId: string
    sourceChannelId?: string
    userId: string
    text: string
}

export interface TwitchStreamOnline {
    displayName: string
    name: string
    userId: string
    gameName?: string
    profilePictureUrl?: string
}

export type ChatMessageListener = (message: TwitchChatMessage) => Promise<string | undefined>
export type StreamOnlineListener = (stream: TwitchStreamOnline) => Promise<void>
export type RedemptionListener = (redemption: TwitchRedemption, refund?: () => Promise<void>) => Promise<void>
