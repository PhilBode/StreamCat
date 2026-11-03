import {Inject, Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import type {Command} from "./command.types"
import {TWITCH_SUB_COMMANDS, type TwitchSubCommand} from "./twitch/twitch-sub-command.interface"
import {requireGuild, requireServerAdminOrThrow} from "../helpers/helpers"

@Injectable()
export class TwitchCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("twitch")
        .setDescription("Twitch commands")
        .addSubcommand((sub) =>
            sub
                .setName("follow")
                .setDescription("Follow a Twitch streamer")
                .addStringOption((option) =>
                    option.setName("username").setDescription("Twitch username").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("unfollow")
                .setDescription("Unfollow a Twitch streamer")
                .addStringOption((option) =>
                    option.setName("username").setDescription("Twitch username").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-main-message")
                .setDescription("Set the main live notification message template")
                .addStringOption((option) =>
                    option
                        .setName("template")
                        .setDescription("Message template (e.g. {Username} is LIVE!)")
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-partner-message")
                .setDescription("Set the partner live notification message template")
                .addStringOption((option) =>
                    option
                        .setName("template")
                        .setDescription("Message template (e.g. {Username} is LIVE!)")
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("post-live").setDescription("Re-post the live notification for the main streamer")
        )
        .addSubcommand((sub) => sub.setName("login").setDescription("Authorize Twitch for this server"))
        .addSubcommand((sub) =>
            sub
                .setName("set-sr-reward")
                .setDescription("Set the channel point reward ID for song requests")
                .addStringOption((option) =>
                    option
                        .setName("reward-id")
                        .setDescription("The reward ID from Twitch (optional — opens reward picker if empty)")
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("tracked").setDescription("List all followed Twitch streamers for this server")
        )
    private logger: ModuleLogger
    private readonly handlers = new Map<string, TwitchSubCommand>()

    constructor(botLogger: BotLoggerService, @Inject(TWITCH_SUB_COMMANDS) handlers: TwitchSubCommand[]) {
        this.logger = botLogger.forModule("TwitchCommand")
        for (const handler of handlers) {
            this.handlers.set(handler.name, handler)
        }
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        requireGuild(interaction)
        const subcommand = interaction.options.getSubcommand()
        if (subcommand !== "tracked") {
            await requireServerAdminOrThrow(interaction)
        }
        const handler =
            subcommand.startsWith("set-") && subcommand.endsWith("-message")
                ? this.handlers.get("set-message")
                : this.handlers.get(subcommand)
        if (handler) {
            this.logger.debug(`Dispatching twitch subcommand: ${subcommand}`)
            await handler.execute(interaction)
        } else {
            throw new Error(`Unknown subcommand: ${subcommand}`)
        }
    }
}
