import {type TwitchConfigRecord, TwitchConfigRepository, TwitchRewardRepository} from "@streamcat/db"
import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, EmbedBuilder, MessageFlags} from "discord.js"
import {requireGuild} from "../../helpers/helpers"
import {BotLoggerService, EMBED_FOOTER, type ModuleLogger} from "@streamcat/core"
import {TwitchBot} from "../../../twitch/twitch-bot"
import {TwitchRewardKind} from "@streamcat/interfaces"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class TrackedSubCommand implements TwitchSubCommand {
    readonly name = "tracked"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly twitchRewardRepo: TwitchRewardRepository,
        private readonly twitchBot: TwitchBot
    ) {
        this.logger = this.botLogger.forModule("TrackedSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = requireGuild(interaction).id

        await interaction.deferReply({flags: MessageFlags.Ephemeral})

        const streams = await this.twitchConfigRepo.findByGuildId(guildId)

        if (streams.length === 0) {
            await interaction.editReply({
                content: "No Twitch streamers tracked for this server. Use `/twitch follow <username>` to add one."
            })
            return
        }

        await this.resolveUnresolvedUserIds(streams)
        const hasSongRequests = await this.twitchRewardRepo.hasKind(guildId, TwitchRewardKind.SPOTIFY_SR)
        const liveStatus = await this.buildStreamerStatus(streams, hasSongRequests)

        const embed = new EmbedBuilder()
            .setColor("#9146FF")
            .setTitle(`Tracked Streamers (${streams.length})`)
            .setDescription(liveStatus)
            .setTimestamp()
            .setFooter({text: EMBED_FOOTER})

        await interaction.editReply({embeds: [embed]})
    }

    private buildStaticStreamerList(streams: TwitchConfigRecord[], hasSongRequests = false): string {
        return streams
            .map(
                (s) =>
                    `\n${s.mainStream ? ":star:" : ":small_blue_diamond:"} ${s.username}${s.mainStream && hasSongRequests ? " :notes:" : ""}`
            )
            .join("")
    }

    private async buildStreamerStatus(streams: TwitchConfigRecord[], hasSongRequests = false): Promise<string> {
        const userIds = streams.map((s) => s.channelId).filter(Boolean) as string[]
        if (userIds.length === 0 || !this.twitchBot) return this.buildStaticStreamerList(streams, hasSongRequests)

        try {
            const liveStreams = await this.twitchBot.getLiveStreams(userIds)
            const liveIds = new Set(liveStreams.map((s) => s.userId))
            let status = ""

            for (const stream of liveStreams) {
                status += `\n:green_circle: **${stream.userDisplayName}** — ${stream.gameName ?? "No category"} (${stream.viewers} viewers)`
            }

            for (const stream of streams) {
                if (stream.channelId && !liveIds.has(stream.channelId)) {
                    status += `\n:red_circle: ${stream.username}`
                }
            }

            for (const stream of streams) {
                if (!stream.channelId) {
                    status += `\n:white_circle: ${stream.username} (unknown username — unfollow and re-follow with correct name)`
                }
            }

            return status
        } catch {
            return this.buildStaticStreamerList(streams, hasSongRequests)
        }
    }

    private async resolveUnresolvedUserIds(streams: TwitchConfigRecord[]): Promise<void> {
        if (!this.twitchBot) return
        for (const stream of streams) {
            if (!stream.channelId) {
                try {
                    const userId = await this.twitchBot.resolveUserId(stream.username)
                    stream.channelId = userId
                    if (stream.guildId) {
                        await this.twitchConfigRepo.updateChannelId(stream.guildId, stream.username, userId)
                    }
                } catch {
                    this.logger.debug(`Could not resolve user ID for ${stream.username}`)
                }
            }
        }
    }
}
