import {ForbiddenException, Injectable} from "@nestjs/common"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js"
import {EmbedFactory} from "../embed/embed-factory"
import {GuildConfigRepository} from "@streamcat/db"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../embed/embed-error-handler"
import type {Command} from "./command.types"

@Injectable()
export class GlobalCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("global")
        .setDescription("Owner-only global broadcast commands")
        .addSubcommand((sub) =>
            sub
                .setName("message")
                .setDescription("Send an embed message to all guilds")
                .addStringOption((option) => option.setName("title").setDescription("Embed title").setRequired(true))
                .addStringOption((option) =>
                    option.setName("content").setDescription("Embed content").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("chat")
                .setDescription("Send a plain text message to all guilds")
                .addStringOption((option) => option.setName("message").setDescription("Message text").setRequired(true))
        )
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private guildConfigRepo: GuildConfigRepository,
        private readonly access: GuildAccessService
    ) {
        this.logger = this.botLogger.forModule("GlobalCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            await this.access.requireInstallationOwner(interaction.user.id)
        } catch (error) {
            if (!(error instanceof ForbiddenException)) throw error
            await interaction.reply({
                content: "❌ Only the bot owner can use this command.",
                flags: MessageFlags.Ephemeral
            })
            return
        }

        const subcommand = interaction.options.getSubcommand()
        switch (subcommand) {
            case "message":
                await this.handleGlobalMessage(interaction)
                break
            case "chat":
                await this.handleGlobalChat(interaction)
                break
            default:
                await interaction.reply({content: "Unknown global command.", flags: MessageFlags.Ephemeral})
        }
    }

    private async handleGlobalMessage(interaction: ChatInputCommandInteraction): Promise<void> {
        const title = interaction.options.getString("title", true)
        const content = interaction.options.getString("content", true)

        await interaction.deferReply({flags: MessageFlags.Ephemeral})

        try {
            const sent = await this.#broadcastToAllGuilds(interaction, async (channel) => {
                const embed = EmbedFactory.globalBroadcast(title, content)
                await channel.send({embeds: [embed]})
            })
            await interaction.editReply({content: `✅ Broadcast sent to **${sent}** guild(s).`})
            this.logger.info(`Global message sent to ${sent} guilds by ${interaction.user.tag}`)
        } catch (error) {
            this.logger.error(`Global message error: ${errorDetails(error)}`)
            await sendErrorEmbed(interaction, createErrorEmbed("Failed to send global message."))
        }
    }

    private async handleGlobalChat(interaction: ChatInputCommandInteraction): Promise<void> {
        const message = interaction.options.getString("message", true)

        await interaction.deferReply({flags: MessageFlags.Ephemeral})

        try {
            const sent = await this.#broadcastToAllGuilds(interaction, async (channel) => {
                await channel.send(message)
            })
            await interaction.editReply({content: `✅ Chat sent to **${sent}** guild(s).`})
            this.logger.info(`Global chat sent to ${sent} guilds by ${interaction.user.tag}`)
        } catch (error) {
            this.logger.error(`Global chat error: ${errorDetails(error)}`)
            await sendErrorEmbed(interaction, createErrorEmbed("Failed to send global chat."))
        }
    }

    async #broadcastToAllGuilds(
        interaction: ChatInputCommandInteraction,
        send: (channel: TextChannel) => Promise<void>
    ): Promise<number> {
        const guildConfigs = await this.guildConfigRepo.findAll()
        let sent = 0
        for (const guildConfig of guildConfigs) {
            const channel = await interaction.client.channels.fetch(guildConfig.logChannel).catch(() => null)
            if (!channel?.isTextBased()) continue
            await send(channel as TextChannel)
            sent++
        }
        return sent
    }
}
