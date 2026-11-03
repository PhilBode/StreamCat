import {Injectable, OnModuleInit, OnModuleDestroy} from "@nestjs/common"
import {TwitchChatClient} from "../../integrations/twitch/chat/twitch-chat-client"
import {TwitchEventSubManager} from "../../integrations/twitch/eventsub/twitch-event-sub-manager"
import {TwitchStreamHandler} from "./eventsub/twitch-stream-handler"
import {TwitchRedemptionHandler} from "./redemptions/twitch-redemption-handler"
import {SongRequestChatHandler} from "./chat/song-request-chat.handler"

@Injectable()
export class TwitchEventsService implements OnModuleInit, OnModuleDestroy {
    private removeListeners: Array<() => void> = []

    constructor(
        private readonly chat: TwitchChatClient,
        private readonly events: TwitchEventSubManager,
        private readonly streams: TwitchStreamHandler,
        private readonly redemptions: TwitchRedemptionHandler,
        private readonly requests: SongRequestChatHandler
    ) {}

    onModuleInit(): void {
        this.removeListeners = [
            this.chat.onMessage((message) => this.requests.handle(message)),
            this.events.onStreamOnline((stream) =>
                this.streams.handleStreamOnline(
                    stream.displayName,
                    stream.name,
                    stream.userId,
                    stream.gameName,
                    stream.profilePictureUrl
                )
            ),
            this.events.onRedemption((redemption, refund) => this.redemptions.handleRedemption(redemption, refund))
        ]
    }

    onModuleDestroy(): void {
        for (const remove of this.removeListeners) remove()
        this.removeListeners = []
    }
}
