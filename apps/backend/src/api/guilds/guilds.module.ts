import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {DiscordClientModule} from "../../integrations/discord/discord-client.module"
import {AccountLinkingModule} from "../../features/account-linking/account-linking.module"
import {SongRequestsModule} from "../../features/song-requests/song-requests.module"
import {StreamNotificationsModule} from "../../features/stream-notifications/stream-notifications.module"
import {AuthModule} from "../auth/auth.module"
import {GuildsController} from "./controllers/guilds.controller"
import {GuildConnectionsController} from "./controllers/guild-connections.controller"
import {SongRequestsController} from "./controllers/song-requests.controller"
import {TwitchStreamersController} from "./controllers/twitch-streamers.controller"
import {GuildsService} from "./services/guilds.service"
import {SpotifyModule} from "../../integrations/spotify/spotify.module"

@Module({
    imports: [
        PrismaModule,
        DiscordClientModule,
        AccountLinkingModule,
        SongRequestsModule,
        SpotifyModule,
        StreamNotificationsModule,
        AuthModule
    ],
    controllers: [GuildsController, GuildConnectionsController, SongRequestsController, TwitchStreamersController],
    providers: [GuildsService]
})
export class GuildsModule {}
