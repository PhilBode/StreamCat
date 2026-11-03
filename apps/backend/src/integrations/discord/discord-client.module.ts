import {GuildAccessService} from "./guild-access.service"
import {Module} from "@nestjs/common"
import {Client, GatewayIntentBits} from "discord.js"

@Module({
    providers: [
        GuildAccessService,
        {
            provide: Client,
            useFactory: () =>
                new Client({
                    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
                })
        }
    ],
    exports: [Client, GuildAccessService]
})
export class DiscordClientModule {}
