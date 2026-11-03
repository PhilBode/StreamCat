import {Module} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {LoggingModule} from "./runtime/logging.module"
import {RuntimeModule} from "./runtime/runtime.module"
import {ApiModule} from "./api/api.module"
import {BotsModule} from "./bots/bots.module"

@Module({imports: [LoggingModule, PrismaModule, RuntimeModule, ApiModule, BotsModule]})
export class AppModule {}
