import {Injectable} from "@nestjs/common"
import {ButtonInteraction} from "discord.js"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {TwitchHelpersService} from "../commands/twitch-helpers.service"
import {parseCustomId, requireInteractionGuild} from "./interaction-utils"
import type {ButtonHandler} from "./interaction.types"

@Injectable()
export class SrRewardPageHandler implements ButtonHandler {
    readonly prefix = "sr-reward:page"

    constructor(
        private readonly helpers: TwitchHelpersService,
        private readonly access: GuildAccessService
    ) {}

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId, value} = parseCustomId(customId)
        if (!(await requireInteractionGuild(interaction, guildId))) return
        await this.access.requireAdmin(guildId, interaction.user.id)
        await interaction.deferUpdate()
        const page = /^\d+$/.test(value) ? Number(value) : 0
        await this.helpers.showRewardPicker(interaction, guildId, "This channel", page)
    }
}
