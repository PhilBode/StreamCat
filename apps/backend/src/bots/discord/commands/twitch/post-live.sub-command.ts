import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags} from "discord.js"
import {requireGuild, requireServerAdminOrThrow} from "../../helpers/helpers"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../../embed/embed-error-handler"
import {TwitchBot} from "../../../twitch/twitch-bot"
import {NotificationService} from "../../notifications/notification.service"
import {TwitchConfigRepository} from "@streamcat/db"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class PostLiveSubCommand implements TwitchSubCommand {
    readonly name = "post-live"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly twitchBot: TwitchBot,
        private readonly notification: NotificationService
    ) {
        this.logger = this.botLogger.forModule("PostLiveSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await requireServerAdminOrThrow(interaction)
        const guildId = requireGuild(interaction).id

        try {
            const mainStreamer = await this.twitchConfigRepo.findMainByGuildId(guildId)
            if (!mainStreamer) {
                await sendErrorEmbed(
                    interaction,
                    createErrorEmbed("No main streamer configured. Use `/twitch login` first.")
                )
                return
            }

            await interaction.deferReply({flags: MessageFlags.Ephemeral})

            const username = mainStreamer.username
            const url = `https://twitch.tv/${username}`
            const streamData = await this.twitchBot.fetchStreamData(username)
            const delivered = await this.notification.sendMainStreamNotificationForGuild(guildId, {
                username,
                title: streamData.title,
                url,
                game: streamData.game,
                profilePictureUrl: streamData.profilePictureUrl
            })
            if (!delivered) {
                await sendErrorEmbed(
                    interaction,
                    createErrorEmbed("Could not post the notification. Check the configured channel and permissions.")
                )
                return
            }
            this.logger.debug(`Live notification posted for guild ${guildId}`)
            await interaction.editReply({content: "Live notification posted"})
        } catch (err) {
            this.logger.error(`Failed to post live notification for guild ${guildId}: ${errorDetails(err)}`)
            await sendErrorEmbed(interaction, createErrorEmbed(`Could not post the notification: ${err}`))
        }
    }
}
