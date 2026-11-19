import {Injectable} from "@nestjs/common"
import {ButtonInteraction} from "discord.js"
import {requireServerAdminOrThrow} from "../helpers/helpers"
import {disableRow, parseCustomId} from "./interaction-utils"
import type {ButtonHandler} from "./interaction.types"

const CANCEL_MESSAGES: Record<string, string> = {
    reauth: "❌ Re-authentication cancelled.",
    "sr-reward": "❌ Cancelled — reward not saved.",
    notification: "❌ Cancelled — template was not saved.",
    settings: "❌ Reset cancelled.",
    disconnect: "❌ Disconnect cancelled."
}

@Injectable()
export class GenericCancelHandler implements ButtonHandler {
    readonly prefix = "cancel"

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {prefix: type} = parseCustomId(customId)
        await requireServerAdminOrThrow(interaction)

        const message = CANCEL_MESSAGES[type] ?? "❌ Cancelled."
        await disableRow(interaction, message)
    }
}
