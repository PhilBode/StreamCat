import type {ButtonInteraction, StringSelectMenuInteraction} from "discord.js"

export const BUTTON_HANDLERS = "BUTTON_HANDLERS"
export const SELECT_MENU_HANDLERS = "SELECT_MENU_HANDLERS"

export interface ButtonHandler {
    prefix: string

    execute(interaction: ButtonInteraction, customId: string): Promise<void>
}

export interface SelectMenuHandler {
    prefix: string

    execute(interaction: StringSelectMenuInteraction, customId: string, values: string[]): Promise<void>
}
