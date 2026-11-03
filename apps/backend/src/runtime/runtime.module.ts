import {Module} from "@nestjs/common"
import {SpotifyModule} from "../integrations/spotify/spotify.module"
import {TwitchModule} from "../bots/twitch/twitch.module"
import {RuntimeService} from "./runtime.service"

@Module({
    imports: [SpotifyModule, TwitchModule],
    providers: [RuntimeService],
    exports: [RuntimeService]
})
export class RuntimeModule {}
