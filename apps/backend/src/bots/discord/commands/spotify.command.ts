import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import {EmbedFactory} from "../embed/embed-factory"
import {requireGuild, requireServerAdminOrThrow} from "../helpers/helpers"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../embed/embed-error-handler"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"
import {SpotifyConnectionService} from "../../../features/account-linking/providers/spotify-connection.service"
import type {Command} from "./command.types"
import {DiscordAccountLinkingService} from "../services/account-linking.service"

@Injectable()
export class SpotifyCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("spotify")
        .setDescription("Spotify commands")
        .addSubcommand((sub) =>
            sub
                .setName("login")
                .setDescription("Connect a Spotify account")
                .addStringOption((option) => option.setName("client_id").setDescription("Client ID").setRequired(false))
                .addStringOption((option) =>
                    option.setName("client_secret").setDescription("Client Secret").setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("logout").setDescription("Disconnect Spotify and delete its saved credentials")
        )
        .addSubcommand((sub) => sub.setName("playing").setDescription("Currently Playing"))
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private spotifyService: SpotifyService,
        private spotifyConnectionService: SpotifyConnectionService,
        private readonly accountLinking: DiscordAccountLinkingService
    ) {
        this.logger = this.botLogger.forModule("SpotifyCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand()
        if (subcommand === "playing") {
            await this.handlePlaying(interaction)
            return
        }
        if (subcommand === "logout") {
            await requireServerAdminOrThrow(interaction)
            this.logger.info(`Spotify logout requested for guild ${interaction.guildId}`)
            await this.accountLinking.askDisconnect(interaction, "spotify")
            return
        }

        const clientId = interaction.options.getString("client_id")
        const clientSecret = interaction.options.getString("client_secret")
        await requireServerAdminOrThrow(interaction)

        const guild = requireGuild(interaction)
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        const hasSavedCredentials = await this.spotifyConnectionService.hasSavedCredentials(guild.id)
        if ((!clientId || !clientSecret) && !hasSavedCredentials) {
            const embed = EmbedFactory.spotifyTutorial()
            await interaction.editReply({embeds: [embed]})
            return
        }

        if (clientId && !/^[a-f0-9]{32}$/i.test(clientId)) {
            await interaction.editReply({
                content: "Invalid client_id format. Expected a 32-character hex string."
            })
            return
        }

        if (clientSecret && (clientSecret.length < 16 || clientSecret.length > 64)) {
            await interaction.editReply({
                content: "Invalid client_secret format. Expected 16-64 characters."
            })
            return
        }

        this.logger.info(`Spotify login initiated for guild ${guild.id}`)
        const options = await this.spotifyConnectionService.createAuthorizationOptions(guild.id, clientId, clientSecret)
        await this.accountLinking.startOAuth(interaction, options)
        await interaction.followUp({content: "Settings saved!", flags: MessageFlags.Ephemeral})
    }

    private async handlePlaying(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply()

        const guild = requireGuild(interaction)
        const guildId = guild.id

        try {
            const playback = await this.spotifyService.getPlaybackState(guildId)
            if (playback.status === "error") throw new Error("Spotify playback unavailable")
            const song = playback.status === "playing" || playback.status === "paused" ? playback : null
            if (!this.spotifyService.hasGuildInstance(guildId)) {
                await interaction.editReply({content: "Spotify not connected. Use `/spotify login` first."})
                return
            }
            if (!song) {
                await interaction.editReply({content: "Not currently playing anything on Spotify."})
                return
            }
            await interaction.editReply({content: `🎵 Currently playing: **${song.text}**`})
        } catch {
            await sendErrorEmbed(interaction, createErrorEmbed("Error communicating with Spotify."))
        }
    }
}
