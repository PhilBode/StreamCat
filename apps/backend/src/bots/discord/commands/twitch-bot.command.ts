import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import {TwitchBotLoginService} from "../../../features/account-linking/providers/twitch-bot-login.service"
import {DiscordAccountLinkingService} from "../services/account-linking.service"
import {requireGuild} from "../helpers/helpers"
import type {Command} from "./command.types"

@Injectable()
export class TwitchBotCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("twitch-bot")
        .setDescription("Manage StreamCat's Twitch bot account")
        .addSubcommand((sub) =>
            sub.setName("login").setDescription("Connect the Twitch bot account (installation owner only)")
        )

    constructor(
        private readonly botLogin: TwitchBotLoginService,
        private readonly accountLinking: DiscordAccountLinkingService
    ) {}

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        const guild = requireGuild(interaction)
        const options = await this.botLogin.createAuthorizationOptions(guild.id)
        await this.accountLinking.startOAuth(interaction, options)
        await interaction.editReply({content: "Twitch bot account connected successfully."})
    }
}
