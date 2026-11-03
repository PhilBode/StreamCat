import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {TwitchProviderModule} from "../../integrations/twitch/twitch-provider.module"
import {StreamerFollowService} from "./streamer-follow.service"

@Module({
    imports: [PrismaModule, TwitchProviderModule],
    providers: [StreamerFollowService],
    exports: [StreamerFollowService]
})
export class StreamNotificationsModule {}
