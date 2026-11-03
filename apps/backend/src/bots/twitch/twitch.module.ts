import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {AccountLinkingModule} from "../../features/account-linking/account-linking.module"
import {SongRequestsModule} from "../../features/song-requests/song-requests.module"
import {TwitchProviderModule} from "../../integrations/twitch/twitch-provider.module"
import {NotificationsModule} from "../discord/notifications/notifications.module"
import {TwitchStreamHandler} from "./eventsub/twitch-stream-handler"
import {TwitchRedemptionHandler} from "./redemptions/twitch-redemption-handler"
import {TwitchBot} from "./twitch-bot"
import {REDEMPTION_HANDLERS} from "./redemptions/redemption-handler.interface"
import {SpotifySongRequestHandler} from "./redemptions/spotify-song-request.handler"
import {SongRequestChatHandler} from "./chat/song-request-chat.handler"
import {TwitchEventsService} from "./twitch-events.service"

@Module({
    imports: [PrismaModule, AccountLinkingModule, SongRequestsModule, TwitchProviderModule, NotificationsModule],
    providers: [
        TwitchStreamHandler,
        SpotifySongRequestHandler,
        {
            provide: REDEMPTION_HANDLERS,
            useFactory: (spotify: SpotifySongRequestHandler) => [spotify],
            inject: [SpotifySongRequestHandler]
        },
        TwitchRedemptionHandler,
        TwitchBot,
        SongRequestChatHandler,
        TwitchEventsService
    ],
    exports: [TwitchProviderModule, SongRequestsModule, AccountLinkingModule, TwitchBot]
})
export class TwitchModule {}
