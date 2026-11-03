import {renderNotificationTemplate} from "../notifications/notification.service"
import {NotificationDraftsService} from "../notifications/notification-drafts.service"
import {Injectable} from "@nestjs/common"
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js"
import {EmbedFactory} from "../embed/embed-factory"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {buildCustomId} from "../interactions/custom-id"
import {SongRequestRewardsService} from "../../../features/song-requests/song-request-rewards.service"
import {TwitchConnectionService} from "../../../features/account-linking/providers/twitch-connection.service"
import {DiscordAccountLinkingService} from "../services/account-linking.service"
import {requireGuild} from "../helpers/helpers"

@Injectable()
export class TwitchHelpersService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly rewards: SongRequestRewardsService,
        private readonly oauthFlow: DiscordAccountLinkingService,
        private readonly twitchConnection: TwitchConnectionService,
        private readonly drafts: NotificationDraftsService
    ) {
        this.logger = this.botLogger.forModule("TwitchHelpersService")
    }

    async showReauthPrompt(interaction: ChatInputCommandInteraction, guildId: string, username: string): Promise<void> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(buildCustomId("reauth", "confirm", guildId))
                .setLabel("Re-authenticate")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(buildCustomId("reauth", "cancel", guildId))
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        )

        await interaction.reply({
            content: `Already authenticated as **${username}**.\n\nDo you want to re-authenticate with a different Twitch account? This will replace the current auth.`,
            components: [row],
            flags: MessageFlags.Ephemeral
        })
    }

    async sendAuthSuccess(
        interaction: ChatInputCommandInteraction,
        tokens: {
            username: string
        },
        guildId: string
    ): Promise<void> {
        await interaction.followUp({
            content: `Successfully authenticated as **${tokens.username}**!\n\nThey are now the **main streamer** for this server.\nUse \`/twitch follow\` to add more streamers.`,
            flags: MessageFlags.Ephemeral
        })
        this.logger.info(`Twitch login complete for guild ${guildId} (${tokens.username})`)
    }

    async showNotificationPreview(
        interaction: ChatInputCommandInteraction,
        template: string,
        type: "main" | "partner"
    ): Promise<void> {
        const guildId = requireGuild(interaction).id

        const rendered = renderNotificationTemplate(template, {
            username: "StreamCat",
            title: "Just Chatting with the community",
            game: "Just Chatting",
            url: "https://twitch.tv/StreamCat"
        })

        const previewEmbed = EmbedFactory.templatePreview()
        const draftId = this.drafts.create(guildId, interaction.user.id, type, template)

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(buildCustomId("notification", "confirm", guildId, draftId))
                .setLabel("Save")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(buildCustomId("notification", "cancel", guildId))
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
        )

        await interaction.reply({
            content: `**Template:**\n\`${template}\`\n\n**Preview result:**\n${rendered}`,
            embeds: [previewEmbed],
            components: [row],
            flags: MessageFlags.Ephemeral
        })
    }

    async startTwitchOAuth(interaction: ChatInputCommandInteraction | ButtonInteraction, guildId: string) {
        const options = this.twitchConnection.createAuthorizationOptions(guildId)
        return this.oauthFlow.startOAuth(interaction, options)
    }

    async showRewardPicker(
        interaction: ChatInputCommandInteraction | ButtonInteraction,
        guildId: string,
        username: string,
        requestedPage = 0
    ): Promise<void> {
        try {
            const validRewards = await this.rewards.getForGuild(guildId)
            if (!validRewards || validRewards.length === 0) {
                await interaction.editReply({
                    content:
                        "No custom rewards with text input found for this channel.\n\n" +
                        'Create a channel point reward with "Requires Input" enabled, then run this command again.\n\n' +
                        "Alternatively, provide the reward ID directly: `/twitch set-sr-reward <reward-id>`"
                })
                return
            }

            const pageCount = Math.ceil(validRewards.length / 25)
            const page = Math.max(0, Math.min(pageCount - 1, requestedPage))
            const select = new StringSelectMenuBuilder()
                .setCustomId(`sr-reward:select:${guildId}`)
                .setPlaceholder("Choose a reward for song requests")
                .addOptions(
                    validRewards
                        .slice(page * 25, (page + 1) * 25)
                        .map((r) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(r.title)
                                .setDescription(`Cost: ${r.cost} points`)
                                .setValue(r.id)
                        )
                )

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
            const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(buildCustomId("sr-reward", "page", guildId, String(Math.max(0, page - 1))))
                    .setLabel("Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(buildCustomId("sr-reward", "page", guildId, String(page + 1)))
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === pageCount - 1)
            )
            await interaction.editReply({
                content: `**${username}** has ${validRewards.length} reward(s) with text input. Select which one should trigger song requests:`,
                components: pageCount > 1 ? [row, navigation] : [row]
            })
        } catch (err) {
            this.logger.error(`Failed to fetch Twitch rewards: ${errorDetails(err)}`)
            await interaction.editReply({
                content:
                    "Could not fetch rewards. Make sure the bot's Twitch account has access to this channel.\n\n" +
                    "Try providing the reward ID directly: `/twitch set-sr-reward <reward-id>`"
            })
        }
    }
}
