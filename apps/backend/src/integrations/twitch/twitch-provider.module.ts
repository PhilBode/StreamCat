import {TwitchChatClient} from "./chat/twitch-chat-client"
import {TwitchEventSubManager} from "./eventsub/twitch-event-sub-manager"
import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {TwitchAuthProvider} from "./auth/twitch-auth-provider"
import {TwitchOAuthProvider} from "./auth/twitch-oauth-provider"
import {TwitchBotAccountService} from "./auth/twitch-bot-account.service"
import {TwitchService} from "./services/twitch.service"

@Module({
    imports: [PrismaModule],
    providers: [
        TwitchAuthProvider,
        TwitchOAuthProvider,
        TwitchBotAccountService,
        TwitchService,
        TwitchChatClient,
        TwitchEventSubManager
    ],
    exports: [
        TwitchAuthProvider,
        TwitchOAuthProvider,
        TwitchBotAccountService,
        TwitchService,
        TwitchChatClient,
        TwitchEventSubManager
    ]
})
export class TwitchProviderModule {}
