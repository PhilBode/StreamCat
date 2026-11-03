import {Module} from "@nestjs/common"
import {DiscordModule} from "./discord/discord.module"
import {TwitchModule} from "./twitch/twitch.module"

@Module({imports: [DiscordModule, TwitchModule]})
export class BotsModule {}
