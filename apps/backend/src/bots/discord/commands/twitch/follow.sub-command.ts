import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags} from "discord.js"
import {requireGuild} from "../../helpers/helpers"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {StreamerFollowService} from "../../../../features/stream-notifications/streamer-follow.service"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class FollowSubCommand implements TwitchSubCommand {
    readonly name = "follow"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly follows: StreamerFollowService
    ) {
        this.logger = this.botLogger.forModule("FollowSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const username = interaction.options.getString("username", true)
        const guildId = requireGuild(interaction).id

        await this.follows.followStreamer(guildId, username)

        this.logger.debug(`Followed ${username} in guild ${guildId}`)
        await interaction.reply({content: `Followed ${username}`, flags: MessageFlags.Ephemeral})
    }
}
