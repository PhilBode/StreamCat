import "reflect-metadata"
import {configureHttp} from "./api/http"
import {NestFactory} from "@nestjs/core"

import {checkConfiguration} from "./runtime/configuration"
import {TwitchEventSubManager} from "./integrations/twitch/eventsub/twitch-event-sub-manager"
import {AppModule} from "./app.module"
import {BotLoggerService, errorDetails, PORT, versionLabel} from "@streamcat/core"

async function bootstrap() {
    checkConfiguration()
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true
    })
    const bootstrapLogger = app.get(BotLoggerService)
    app.useLogger(bootstrapLogger)
    bootstrapLogger.log(versionLabel, "Bootstrap")

    configureHttp(app)
    app.enableShutdownHooks()

    let closing = false
    const fatal = (error: unknown) => {
        if (closing) return
        closing = true
        bootstrapLogger.error(`Fatal process error ${errorDetails(error)}`, "Bootstrap")
        const timeout = setTimeout(() => process.exit(1), 5000)
        timeout.unref()
        void app.close().finally(() => process.exit(1))
    }
    process.on("uncaughtException", fatal)
    process.on("unhandledRejection", fatal)

    await app.listen(PORT.BACKEND)
    await app.get(TwitchEventSubManager).markWebhookReady()
    bootstrapLogger.info(`API running on port ${PORT.BACKEND}`, "Bootstrap")
}

void bootstrap().catch((error) => {
    console.error(error instanceof Error ? error.message : "Backend startup failed")
    process.exit(1)
})
