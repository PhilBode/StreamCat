import {ForbiddenException, Injectable} from "@nestjs/common"
import {ButtonInteraction, ChatInputCommandInteraction, MessageFlags} from "discord.js"
import {
    OAuthFlowService,
    type AuthFlowOptions,
    type AuthResult
} from "../../../features/account-linking/services/oauth-flow.service"

@Injectable()
export class DiscordAccountLinkingService {
    constructor(private readonly flow: OAuthFlowService) {}

    async startOAuth(
        interaction: ChatInputCommandInteraction | ButtonInteraction,
        options: Omit<AuthFlowOptions, "userId">
    ): Promise<AuthResult> {
        if (interaction.guildId !== options.guildId) {
            throw new ForbiddenException("Invalid server.")
        }
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({flags: MessageFlags.Ephemeral})
        }
        const pending = await this.flow.begin({...options, userId: interaction.user.id})
        const title =
            options.scope === "installation"
                ? "Authorize the shared Twitch bot account"
                : `Authorize ${options.label} for this server`

        await interaction.editReply({
            content: `**${title}**\n\n[Open this link](${pending.url})\n\nAfter authorizing, come back here and I'll confirm!`
        })
        return pending.result
    }
}
