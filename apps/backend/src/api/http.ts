import type {INestApplication} from "@nestjs/common"
import type {NextFunction, Request, Response} from "express"
import {frontendUrl} from "@streamcat/core"
import {TwitchEventSubManager} from "../integrations/twitch/eventsub/twitch-event-sub-manager"

export function configureHttp(app: INestApplication): void {
    app.getHttpAdapter().getInstance().set("trust proxy", 1)
    app.use((request: Request, response: Response, next: NextFunction) => {
        response.setHeader("X-Content-Type-Options", "nosniff")
        response.setHeader("X-Frame-Options", "DENY")
        response.setHeader("X-XSS-Protection", "0")
        if (request.path.startsWith("/dashboard")) response.setHeader("Cache-Control", "private, no-store")
        next()
    })
    app.get(TwitchEventSubManager).attachWebhook(app.getHttpAdapter().getInstance())
    app.enableCors({origin: frontendUrl(), credentials: true})
}
