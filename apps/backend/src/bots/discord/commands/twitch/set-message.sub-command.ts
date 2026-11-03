import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction} from "discord.js"
import {requireServerAdminOrThrow} from "../../helpers/helpers"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"
import {TwitchHelpersService} from "../twitch-helpers.service"

@Injectable()
export class SetMessageSubCommand implements TwitchSubCommand {
    readonly name = "set-message"

    constructor(private readonly helpers: TwitchHelpersService) {}

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await requireServerAdminOrThrow(interaction)
        const template = interaction.options.getString("template", true)
        const type = interaction.options.getSubcommand() === "set-main-message" ? "main" : "partner"
        await this.helpers.showNotificationPreview(interaction, template, type)
    }
}
