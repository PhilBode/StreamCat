import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {DiscordClientModule} from "../../integrations/discord/discord-client.module"
import {HealthController} from "./health.controller"

@Module({
    imports: [PrismaModule, DiscordClientModule],
    controllers: [HealthController]
})
export class HealthModule {}
