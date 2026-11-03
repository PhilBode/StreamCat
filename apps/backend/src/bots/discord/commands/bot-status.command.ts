import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import type {Command} from "./command.types"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"

@Injectable()
export class BotStatusCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("bot-status")
        .setDescription("Set the bot's playing status (Owner only)")
        .addStringOption((option) =>
            option.setName("text").setDescription("The status text to display").setRequired(true)
        )
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly access: GuildAccessService
    ) {
        this.logger = this.botLogger.forModule("BotStatusCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        await this.access.requireInstallationOwner(interaction.user.id)
        const status = interaction.options.getString("text", true)
        const botUser = interaction.client.user
        if (!botUser) {
            await interaction.editReply({content: "❌ Bot user not available."})
            return
        }
        botUser.setPresence({activities: [{name: status}]})
        await interaction.editReply({content: `✅ Bot status set to: **${status}**`})
        this.logger.info(`Bot status set to "${status}" by ${interaction.user.tag}`)
    }
}
