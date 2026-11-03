import {SongRequestRewardsService} from "./song-request-rewards.service"
import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {SpotifyModule} from "../../integrations/spotify/spotify.module"
import {TwitchProviderModule} from "../../integrations/twitch/twitch-provider.module"
import {SongRequestService} from "./song-request.service"

@Module({
    imports: [PrismaModule, SpotifyModule, TwitchProviderModule],
    providers: [SongRequestService, SongRequestRewardsService],
    exports: [SongRequestService, SongRequestRewardsService]
})
export class SongRequestsModule {}
