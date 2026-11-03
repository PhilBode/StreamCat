import {Injectable} from "@nestjs/common"
import {NotificationService} from "../../discord/notifications/notification.service"
import {errorDetails, BotLoggerService} from "@streamcat/core"

@Injectable()
export class TwitchStreamHandler {
    private readonly logger

    constructor(
        private readonly notification: NotificationService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async handleStreamOnline(
        displayName: string,
        name: string,
        userId: string,
        gameName?: string,
        profilePictureUrl?: string
    ): Promise<void> {
        this.logger.info(`${displayName} went live!`)
        try {
            await this.notification.sendStreamNotification(userId, {
                username: displayName,
                title: `${displayName} is LIVE!`,
                url: `https://twitch.tv/${name}`,
                game: gameName ?? "Unknown",
                profilePictureUrl: profilePictureUrl ?? ""
            })
        } catch (err) {
            this.logger.error(`Error handling stream online for ${displayName}: ${errorDetails(err)}`)
        }
    }
}
