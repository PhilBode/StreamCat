import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {DiscordClientModule} from "../../integrations/discord/discord-client.module"
import {AccountLinkingModule} from "../../features/account-linking/account-linking.module"
import {DiscordLoginService} from "./discord-login.service"
import {AuthController} from "./controllers/auth.controller"
import {ProviderCallbacksController} from "./controllers/provider-callbacks.controller"
import {SessionGuard} from "./guards/session.guard"
import {GuildAdminGuard} from "./guards/guild-admin.guard"

@Module({
    imports: [PrismaModule, DiscordClientModule, AccountLinkingModule],
    controllers: [AuthController, ProviderCallbacksController],
    providers: [DiscordLoginService, SessionGuard, GuildAdminGuard],
    exports: [DiscordClientModule, DiscordLoginService, SessionGuard, GuildAdminGuard]
})
export class AuthModule {}
