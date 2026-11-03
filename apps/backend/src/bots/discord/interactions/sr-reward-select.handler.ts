import {Injectable} from "@nestjs/common"
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuInteraction} from "discord.js"
import {SelectMenuHandler} from "./interaction.types"
import {buildCustomId, parseCustomId} from "./custom-id"
import {requireInteractionGuild} from "./interaction-utils"

@Injectable()
export class SrRewardSelectHandler implements SelectMenuHandler {
    readonly prefix = "sr-reward:select"

    async execute(interaction: StringSelectMenuInteraction, customId: string, values: string[]): Promise<void> {
        const {guildId} = parseCustomId(customId)
        const rewardId = values[0]

        if (!(await requireInteractionGuild(interaction, guildId))) return

        const rewardLabel = interaction.component.options.find((o) => o.value === rewardId)?.label || rewardId

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(buildCustomId("sr-reward", "confirm", guildId, rewardId))
                .setLabel(`✅ Use "${rewardLabel}"`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(buildCustomId("sr-reward", "cancel", guildId))
                .setLabel("❌ Cancel")
                .setStyle(ButtonStyle.Danger)
        )

        await interaction.update({
            content: `**${rewardLabel}** selected.\n\nSave this reward as the song request trigger?`,
            components: [row]
        })
    }
}
