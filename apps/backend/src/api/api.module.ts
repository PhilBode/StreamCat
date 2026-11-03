import {Module} from "@nestjs/common"
import {AuthModule} from "./auth/auth.module"
import {GuildsModule} from "./guilds/guilds.module"
import {OverlayApiModule} from "./overlays/overlay-api.module"
import {HealthModule} from "./health/health.module"

@Module({imports: [AuthModule, GuildsModule, OverlayApiModule, HealthModule]})
export class ApiModule {}
