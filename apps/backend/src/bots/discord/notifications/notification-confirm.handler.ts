import {NotificationDraftsService} from "./notification-drafts.service"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {Injectable} from "@nestjs/common"
import {ButtonInteraction} from "discord.js"
import {ButtonHandler} from "../interactions/interaction.types"
import {disableRow, parseCustomId, requireInteractionGuild} from "../interactions/interaction-utils"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {NotificationConfigRepository} from "@streamcat/db"

@Injectable()
export class NotificationConfirmHandler implements ButtonHandler {
    readonly prefix = "notification:confirm"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly access: GuildAccessService,
        private notificationConfigRepo: NotificationConfigRepository,
        private readonly drafts: NotificationDraftsService
    ) {
        this.logger = this.botLogger.forModule("NotificationConfirmHandler")
    }

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId, value} = parseCustomId(customId)
        if (!(await requireInteractionGuild(interaction, guildId))) return
        await interaction.deferUpdate()
        await this.access.requireAdmin(guildId, interaction.user.id)
        const {type, template} = this.drafts.get(value, guildId, interaction.user.id)
        const field = type === "main" ? "mainStreamNotification" : "partnerStreamNotification"
        await this.notificationConfigRepo.save(guildId, {[field]: template})
        this.drafts.remove(value)
        await disableRow(interaction, `✅ ${type === "main" ? "Main" : "Partner"} notification message saved!`)
        this.logger.info(`Notification ${type} template saved for guild ${guildId}`)
    }
}
