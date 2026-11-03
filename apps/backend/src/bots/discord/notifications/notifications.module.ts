import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {DiscordClientModule} from "../../../integrations/discord/discord-client.module"
import {NotificationService} from "./notification.service"

@Module({
    imports: [PrismaModule, DiscordClientModule],
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationsModule {}
