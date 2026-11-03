import {Injectable} from "@nestjs/common"
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js"
import {requireGuild, requireServerAdminOrThrow} from "../helpers/helpers"
import {buildCustomId} from "../interactions/custom-id"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import type {Command} from "./command.types"

const RESET_LABELS: Record<string, {label: string; description: string}> = {
    "reset-spotify": {
        label: "Spotify",
        description:
            "This will delete the Spotify client ID, client secret, and all cached tokens from the database. The bot will no longer be able to fetch Spotify playback or handle song requests for this server."
    },
    "reset-twitch": {
        label: "Twitch",
        description:
            "This will delete all Twitch stream follows, auth tokens, and subscription data from the database. The bot will no longer send stream notifications or handle Twitch song requests for this server."
    },
    "reset-server": {
        label: "all server data",
        description:
            "This will delete ALL server configuration, Twitch data, and Spotify data from the database. The bot will leave the server. This action cannot be undone."
    }
}

@Injectable()
export class SettingsCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Reset server-specific settings")
        .addSubcommand((sub) =>
            sub.setName("reset-spotify").setDescription("Reset Spotify configuration for this server")
        )
        .addSubcommand((sub) =>
            sub.setName("reset-twitch").setDescription("Reset all Twitch stream follows for this server")
        )
        .addSubcommand((sub) =>
            sub.setName("reset-server").setDescription("WARNING: Delete ALL server data and leave the server")
        )
    private logger: ModuleLogger

    constructor(private readonly botLogger: BotLoggerService) {
        this.logger = this.botLogger.forModule("SettingsCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand()

        this.logger.debug(`Settings command invoked: ${subcommand} for guild ${requireGuild(interaction).id}`)

        switch (subcommand) {
            case "reset-spotify":
                await this.askConfirmation(interaction, "reset-spotify")
                break
            case "reset-twitch":
                await this.askConfirmation(interaction, "reset-twitch")
                break
            case "reset-server":
                await this.askConfirmation(interaction, "reset-server")
                break
            default:
                this.logger.debug(`Unknown settings subcommand: ${subcommand}`)
                await interaction.reply({content: "Unknown settings command.", flags: MessageFlags.Ephemeral})
        }
    }

    private async askConfirmation(interaction: ChatInputCommandInteraction, type: string): Promise<void> {
        await requireServerAdminOrThrow(interaction)
        if (type === "reset-server") {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: "❌ You need Administrator permission.",
                    flags: MessageFlags.Ephemeral
                })
                return
            }
        }

        const guild = requireGuild(interaction)
        const info = RESET_LABELS[type]!

        const confirmId = buildCustomId("settings", "confirm", guild.id, type)
        const cancelId = buildCustomId("settings", "cancel", guild.id)

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(confirmId)
                .setLabel(`Yes, reset ${info.label}`)
                .setStyle(type === "reset-server" ? ButtonStyle.Danger : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(cancelId).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
        )

        await interaction.reply({
            content: `**Reset ${info.label}?**\n\n${info.description}`,
            components: [row],
            flags: MessageFlags.Ephemeral
        })
    }
}
