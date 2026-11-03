import {Global, Module} from "@nestjs/common"
import {BotLoggerService} from "@streamcat/core"

@Global()
@Module({
    providers: [BotLoggerService],
    exports: [BotLoggerService]
})
export class LoggingModule {}
