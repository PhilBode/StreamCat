import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {SongRequestService} from "../../../features/song-requests/song-request.service"
import {requireGuild} from "../helpers/helpers"
import type {Command} from "./command.types"

@Injectable()
export class SongRequestsCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("song-requests")
        .setDescription("Manage song requests for this server's Twitch channel")
        .addSubcommand((sub) => sub.setName("status").setDescription("Show whether Twitch song requests are enabled"))
        .addSubcommand((sub) => sub.setName("enable").setDescription("Enable Twitch song requests"))
        .addSubcommand((sub) => sub.setName("disable").setDescription("Disable Twitch song requests"))

    constructor(
        private readonly songRequests: SongRequestService,
        private readonly access: GuildAccessService
    ) {}

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        const guild = requireGuild(interaction)
        const subcommand = interaction.options.getSubcommand()
        if (subcommand === "status") {
            const settings = await this.songRequests.getSettings(guild.id)
            const content = !settings.channelId
                ? "No Twitch account is connected to this server. Use `/twitch login` first."
                : !settings.assigned
                  ? "This server is not currently assigned to handle song requests for its linked Twitch channel."
                  : `Song requests are ${settings.enabled ? "enabled" : "disabled"} for this server's Twitch channel.`
            await interaction.editReply({content})
            return
        }

        await this.access.requireAdmin(guild.id, interaction.user.id)
        const settings = await this.songRequests.setEnabled(guild.id, subcommand === "enable")
        await interaction.editReply({
            content: `Song requests ${settings.enabled ? "enabled" : "disabled"} for this server's Twitch channel.`
        })
    }
}
