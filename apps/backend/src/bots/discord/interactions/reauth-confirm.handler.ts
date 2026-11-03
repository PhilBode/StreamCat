import {Injectable} from "@nestjs/common"
import {ButtonInteraction, MessageFlags} from "discord.js"
import {ButtonHandler} from "./interaction.types"
import {parseCustomId, requireInteractionGuild} from "./interaction-utils"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../embed/embed-error-handler"
import {TwitchHelpersService} from "../commands/twitch-helpers.service"

@Injectable()
export class ReauthConfirmHandler implements ButtonHandler {
    readonly prefix = "reauth:confirm"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly helpers: TwitchHelpersService
    ) {
        this.logger = this.botLogger.forModule("ReauthConfirmHandler")
    }

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId} = parseCustomId(customId)
        if (!(await requireInteractionGuild(interaction, guildId))) return

        try {
            const tokens = await this.helpers.startTwitchOAuth(interaction, guildId)
            if (!tokens) return

            await interaction.followUp({
                content: `✅ **Re-authentication successful!** Now authenticated as **${tokens.username}**.`,
                flags: MessageFlags.Ephemeral
            })
            this.logger.info(`Re-auth complete for guild ${guildId} (${tokens.username})`)
        } catch (err) {
            this.logger.error(`Re-auth failed for guild ${guildId}: ${errorDetails(err)}`)
            await sendErrorEmbed(
                interaction,
                createErrorEmbed(`Re-authentication failed: ${err instanceof Error ? err.message : "Unknown error"}`)
            )
        }
    }
}
