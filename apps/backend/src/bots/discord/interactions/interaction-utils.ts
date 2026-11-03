import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ComponentType,
    MessageFlags,
    StringSelectMenuInteraction
} from "discord.js"

export {buildCustomId, parseCustomId} from "./custom-id"

export async function disableRow(interaction: ButtonInteraction, content: string): Promise<void> {
    const firstRow = interaction.message.components[0]?.toJSON()
    const buttons =
        firstRow?.type === ComponentType.ActionRow
            ? firstRow.components.filter((component) => component.type === ComponentType.Button)
            : []
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.map((button) => ButtonBuilder.from(button).setDisabled(true))
    )
    const reply = {content, components: buttons.length ? [row] : []}
    if (interaction.deferred) await interaction.editReply(reply)
    else await interaction.update(reply)
}

export async function requireInteractionGuild(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    guildId: string
): Promise<boolean> {
    if (interaction.guild?.id !== guildId) {
        await interaction.reply({
            content: "❌ This interaction is not for this server.",
            flags: MessageFlags.Ephemeral
        })
        return false
    }
    return true
}
