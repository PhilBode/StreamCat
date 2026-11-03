import type {ButtonInteraction, ChatInputCommandInteraction, Guild, StringSelectMenuInteraction} from "discord.js"
import {PermissionFlagsBits} from "discord.js"
import {RequireServerAdminException} from "../exceptions/require-server-admin.exception"

export function requireGuild(
    interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction
): Guild {
    if (!interaction.guild) {
        throw new Error("This command can only be used in a server.")
    }
    return interaction.guild
}

export async function requireServerAdminOrThrow(
    interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
    if (
        interaction.guild?.ownerId !== interaction.user.id &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
        throw new RequireServerAdminException(interaction.guild)
    }
}
