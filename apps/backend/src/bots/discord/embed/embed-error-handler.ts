import {
    ButtonInteraction,
    CommandInteraction,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuInteraction
} from "discord.js"
import {COLORS, EMBED_FOOTER} from "@streamcat/core"

export function createErrorEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR_RED)
        .setTitle("Error")
        .setDescription(message)
        .setFooter({text: EMBED_FOOTER})
        .setTimestamp()
}

export async function sendErrorEmbed(
    interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction,
    embed: EmbedBuilder
): Promise<void> {
    if (interaction.replied) {
        await interaction.followUp({
            content: "❌ An error occurred while processing your request.",
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        })
    } else if (interaction.deferred) {
        await interaction.editReply({embeds: [embed]})
    } else {
        await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral})
    }
}
