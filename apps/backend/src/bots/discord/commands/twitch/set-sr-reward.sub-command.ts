import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags} from "discord.js"
import {requireGuild} from "../../helpers/helpers"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../../embed/embed-error-handler"
import {SongRequestRewardsService} from "../../../../features/song-requests/song-request-rewards.service"
import {TwitchConfigRepository} from "@streamcat/db"
import {TwitchHelpersService} from "../twitch-helpers.service"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class SetSrRewardSubCommand implements TwitchSubCommand {
    readonly name = "set-sr-reward"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly rewards: SongRequestRewardsService,
        private readonly helpers: TwitchHelpersService
    ) {
        this.logger = this.botLogger.forModule("SetSrRewardSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const rewardId = interaction.options.getString("reward-id")
        const guildId = requireGuild(interaction).id

        if (rewardId) {
            try {
                const result = await this.rewards.setSongRequestReward(guildId, rewardId)
                if (!result) {
                    await sendErrorEmbed(
                        interaction,
                        createErrorEmbed("You aren't connected to Twitch yet! Use `/twitch login`")
                    )
                    return
                }
                this.logger.debug(`Song request reward set to ${rewardId} for guild ${guildId}`)
                await interaction.reply({
                    content: `Song request reward **${result.rewardTitle}** set for **${result.username}**.\nTwitch viewers can now redeem this reward to request songs!`,
                    flags: MessageFlags.Ephemeral
                })
            } catch (err) {
                this.logger.error(`Failed to set SR reward for guild ${guildId}: ${errorDetails(err)}`)
                await sendErrorEmbed(
                    interaction,
                    createErrorEmbed(`Failed to set reward: ${err instanceof Error ? err.message : "Unknown error"}`)
                )
            }
            return
        }

        const mainStreamer = await this.twitchConfigRepo.findMainByGuildId(guildId)
        if (!mainStreamer) {
            this.logger.debug(`No Twitch login found for guild ${guildId} when setting SR reward`)
            await sendErrorEmbed(
                interaction,
                createErrorEmbed("You aren't connected to Twitch yet! Use `/twitch login`")
            )
            return
        }

        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        await this.helpers.showRewardPicker(interaction, guildId, mainStreamer.username)
    }
}
