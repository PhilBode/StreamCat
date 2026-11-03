import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {DiscordClientModule} from "../../integrations/discord/discord-client.module"
import {SpotifyModule} from "../../integrations/spotify/spotify.module"
import {TwitchProviderModule} from "../../integrations/twitch/twitch-provider.module"
import {OAuthFlowService} from "./services/oauth-flow.service"
import {SpotifyConnectionService} from "./providers/spotify-connection.service"
import {TwitchConnectionService} from "./providers/twitch-connection.service"
import {TwitchBotLoginService} from "./providers/twitch-bot-login.service"

@Module({
    imports: [PrismaModule, DiscordClientModule, SpotifyModule, TwitchProviderModule],
    providers: [OAuthFlowService, SpotifyConnectionService, TwitchConnectionService, TwitchBotLoginService],
    exports: [
        DiscordClientModule,
        OAuthFlowService,
        SpotifyConnectionService,
        TwitchConnectionService,
        TwitchBotLoginService
    ]
})
export class AccountLinkingModule {}
