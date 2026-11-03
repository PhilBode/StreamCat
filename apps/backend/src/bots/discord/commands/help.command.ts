import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder} from "discord.js"
import {COLORS, EMBED_FOOTER} from "@streamcat/core"
import type {Command} from "./command.types"

@Injectable()
export class HelpCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Help and information")
        .addSubcommand((sub) => sub.setName("notifications").setDescription("How to set stream notification templates"))
        .addSubcommand((sub) => sub.setName("memory").setDescription("Show bot memory usage"))

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case "notifications":
                await this.handleNotificationMessage(interaction)
                break
            case "memory":
                await this.handleMemoryUsage(interaction)
                break
            default:
                await interaction.reply({content: "Unknown help subcommand.", flags: MessageFlags.Ephemeral})
        }
    }

    private async handleNotificationMessage(interaction: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setColor(COLORS.BLURPLE)
            .setTitle("How to set your stream notification message")
            .setDescription(
                "Use `/twitch set-main-message` or `/twitch set-partner-message` to configure your notification messages.\n\nPlaceholders are replaced with live stream data when the notification is sent."
            )
            .addFields({
                name: "Placeholders",
                value: "`{Username}` - Streamer display name\n`{Title}` - Stream title\n`{Game}` - Game/category being played\n`{Url}` - Link to Twitch channel",
                inline: false
            })
            .setTimestamp()
            .setFooter({text: EMBED_FOOTER})

        await interaction.reply({embeds: [embed]})
    }

    private async handleMemoryUsage(interaction: ChatInputCommandInteraction): Promise<void> {
        const memUsage = process.memoryUsage()
        const heapUsedMb = (memUsage.heapUsed / 1024 / 1024).toFixed(2)
        const heapTotalMb = (memUsage.heapTotal / 1024 / 1024).toFixed(2)

        const embed = new EmbedBuilder()
            .setColor(COLORS.BLURPLE)
            .setTitle("Memory Usage")
            .addFields(
                {name: "Heap Used", value: `${heapUsedMb} MB`, inline: true},
                {name: "Heap Total", value: `${heapTotalMb} MB`, inline: true}
            )
            .setTimestamp()
            .setFooter({text: EMBED_FOOTER})

        await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral})
    }
}
