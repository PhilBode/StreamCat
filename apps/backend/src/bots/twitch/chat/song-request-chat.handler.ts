import {Injectable} from "@nestjs/common"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {SongRequestService} from "../../../features/song-requests/song-request.service"
import type {TwitchChatMessage} from "../../../integrations/twitch/models/twitch-events"

@Injectable()
export class SongRequestChatHandler {
    private readonly logger: ModuleLogger

    constructor(
        private readonly requests: SongRequestService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("TwitchChat")
    }

    async handle(message: TwitchChatMessage): Promise<string | undefined> {
        if (message.sourceChannelId && message.sourceChannelId !== message.channelId) return
        const command = message.text.trim().match(/^!sr(?:\s+([\s\S]*))?$/i)
        if (!command) {
            return
        }
        this.logger.info(`Song request command received channel=${message.channelId} user=${message.userId}`)
        const result = await this.requests.request(message.channelId, command[1]?.trim() ?? "")
        return result.chatReply
    }
}
