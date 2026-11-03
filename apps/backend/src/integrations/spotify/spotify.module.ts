import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {SpotifyService} from "./spotify.service"
import {SpotifyOAuthProvider} from "./auth/spotify-oauth-provider"

@Module({
    imports: [PrismaModule],
    providers: [SpotifyService, SpotifyOAuthProvider],
    exports: [SpotifyService, SpotifyOAuthProvider]
})
export class SpotifyModule {}
