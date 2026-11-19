import {ForbiddenException, Injectable} from "@nestjs/common"
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    MessageFlags
} from "discord.js"
import {
    OAuthFlowService,
    type AuthFlowOptions,
    type AuthResult
} from "../../../features/account-linking/services/oauth-flow.service"
import {buildCustomId} from "../interactions/custom-id"

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

    async askDisconnect(
        interaction: ChatInputCommandInteraction,
        provider: "twitch" | "spotify"
    ): Promise<void> {
        if (!interaction.guildId) {
            throw new ForbiddenException("This command can only be used in a server.")
        }
        const label = provider === "twitch" ? "Twitch" : "Spotify"
        const description =
            provider === "twitch"
                ? "This deletes the saved Twitch account, the main streamer follow, song request settings and linked channel point rewards for this server. Other followed channels stay."
                : "This deletes the saved Spotify client ID, client secret and tokens for this server. Song request settings stay, but playback and queue stop until you reconnect."

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(buildCustomId("disconnect", "confirm", interaction.guildId, provider))
                .setLabel(`Yes, disconnect ${label}`)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(buildCustomId("disconnect", "cancel", interaction.guildId))
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        )

        await interaction.reply({
            content: `**Disconnect ${label}?**\n\n${description}`,
            components: [row],
            flags: MessageFlags.Ephemeral
        })
    }
}
