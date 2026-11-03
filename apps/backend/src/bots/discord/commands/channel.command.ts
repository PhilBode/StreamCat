import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import {requireGuild, requireServerAdminOrThrow} from "../helpers/helpers"
import {GuildConfigRepository, NotificationConfigRepository} from "@streamcat/db"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import type {Command} from "./command.types"

type ChannelType = "log" | "live" | "partner"

const CHANNEL_LABELS: Record<ChannelType, string> = {
    log: "Log",
    live: "Live notification",
    partner: "Partner notification"
}

@Injectable()
export class ChannelCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("channel")
        .setDescription("Channel configuration and management")
        .addSubcommand((sub) =>
            sub
                .setName("log")
                .setDescription("Set the channel for bot log messages")
                .addChannelOption((option) =>
                    option.setName("channel").setDescription("The channel").setRequired(true).addChannelTypes(0)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("live")
                .setDescription("Set the channel for live stream notifications")
                .addChannelOption((option) =>
                    option.setName("channel").setDescription("The channel").setRequired(true).addChannelTypes(0)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("partner")
                .setDescription("Set the channel for partner stream notifications")
                .addChannelOption((option) =>
                    option.setName("channel").setDescription("The channel").setRequired(true).addChannelTypes(0)
                )
        )

    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly guildConfigRepo: GuildConfigRepository,
        private readonly notificationConfigRepo: NotificationConfigRepository
    ) {
        this.logger = this.botLogger.forModule("ChannelCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand() as ChannelType
        if (subcommand in CHANNEL_LABELS) {
            await this.handleSetChannel(interaction, subcommand)
        } else {
            throw new Error(`Unknown subcommand: ${subcommand}`)
        }
    }

    private async handleSetChannel(interaction: ChatInputCommandInteraction, type: ChannelType): Promise<void> {
        await requireServerAdminOrThrow(interaction)
        const guild = requireGuild(interaction)
        const channel = interaction.options.getChannel("channel", true)

        if (type === "log") {
            await this.guildConfigRepo.saveLogChannel(guild.id, channel.id)
        } else {
            const field = type === "live" ? "liveChannel" : "partnerChannel"
            await this.notificationConfigRepo.save(guild.id, {[field]: channel.id})
        }

        this.logger.info(`${CHANNEL_LABELS[type]} channel set to ${channel.id} by ${interaction.user.tag}`)
        await interaction.reply({
            content: `✅ ${CHANNEL_LABELS[type]} channel set to <#${channel.id}>`,
            flags: MessageFlags.Ephemeral
        })
    }
}
