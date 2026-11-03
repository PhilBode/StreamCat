import {Injectable, OnApplicationBootstrap} from "@nestjs/common"
import {
    BotLoggerService,
    errorDetails,
    frontendUrl,
    spotifyCallbackUrl,
    twitchCallbackUrl,
    type ModuleLogger
} from "@streamcat/core"
import {SpotifyService} from "../integrations/spotify/spotify.service"
import {TwitchBot} from "../bots/twitch/twitch-bot"
import {TwitchEventSubManager} from "../integrations/twitch/eventsub/twitch-event-sub-manager"
import {TwitchChatClient} from "../integrations/twitch/chat/twitch-chat-client"

@Injectable()
export class RuntimeService implements OnApplicationBootstrap {
    private readonly logger: ModuleLogger
    private spotifyStarted = false

    constructor(
        private readonly spotify: SpotifyService,
        private readonly twitch: TwitchBot,
        private readonly eventSub: TwitchEventSubManager,
        private readonly chat: TwitchChatClient,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("BackendRuntime")
    }

    async onApplicationBootstrap(): Promise<void> {
        try {
            await this.spotify.init()
            await this.spotify.start()
            this.spotifyStarted = true
            this.logger.info("Spotify runtime started; individual account failures are reported per guild")
        } catch (error) {
            this.logger.error(`Spotify startup failed ${errorDetails(error)}`)
        }
    }

    async startTwitch(): Promise<void> {
        let twitchStarted = false
        try {
            await this.twitch.start()
            twitchStarted = true
        } catch (error) {
            this.logger.error(`Twitch startup failed ${errorDetails(error)}`)
        }
        try {
            await this.chat.start()
        } catch (error) {
            this.logger.error(`Twitch chat startup failed ${errorDetails(error)}`)
        }
        this.logger.info(
            `Provider runtime: Spotify=${this.spotifyStarted ? "started" : "failed"} Twitch=${twitchStarted ? "started" : "failed"} EventSub=${this.eventSub.startupState} webhook=${this.eventSub.isWebhookActive} websocket=${this.eventSub.isWebSocketActive} websocket_connected=${this.eventSub.isWebSocketConnected} streams_active=${this.eventSub.activeStreamSubscriptionCount} streams_pending=${this.eventSub.pendingStreamSubscriptionCount}`
        )
        this.logger.info(
            `Callback URLs: Twitch ${twitchCallbackUrl()} | Spotify ${spotifyCallbackUrl()} | EventSub ${this.eventSub.webhookUrl ?? "not ready; check PUBLIC_URL and Cloudflared"} | CORS origin: ${frontendUrl()}`
        )
    }
}
