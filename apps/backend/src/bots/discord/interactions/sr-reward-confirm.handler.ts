import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {Injectable} from "@nestjs/common"
import {ButtonInteraction} from "discord.js"
import {ButtonHandler} from "./interaction.types"
import {disableRow, parseCustomId, requireInteractionGuild} from "./interaction-utils"
import {errorDetails, BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {SongRequestRewardsService} from "../../../features/song-requests/song-request-rewards.service"

@Injectable()
export class SrRewardConfirmHandler implements ButtonHandler {
    readonly prefix = "sr-reward:confirm"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly access: GuildAccessService,
        private rewards: SongRequestRewardsService
    ) {
        this.logger = this.botLogger.forModule("SrRewardConfirmHandler")
    }

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId, value} = parseCustomId(customId)
        const rewardId = value

        if (!(await requireInteractionGuild(interaction, guildId))) return
        await interaction.deferUpdate()
        await this.access.requireAdmin(guildId, interaction.user.id)

        try {
            const result = await this.rewards.setSongRequestReward(guildId, rewardId)
            if (!result) {
                await disableRow(interaction, "❌ Main streamer no longer configured.")
                return
            }
            await disableRow(
                interaction,
                `✅ **${result.rewardTitle}** saved! Twitch viewers can now redeem this reward to request songs.`
            )
            this.logger.info(`SpotifySr reward ${rewardId} ("${result.rewardTitle}") confirmed for guild ${guildId}`)
        } catch (err) {
            this.logger.error(`Failed to confirm SR reward for guild ${guildId}: ${errorDetails(err)}`)
            await disableRow(
                interaction,
                `❌ Could not save reward: ${err instanceof Error ? err.message : "Unknown error"}`
            )
        }
    }
}
