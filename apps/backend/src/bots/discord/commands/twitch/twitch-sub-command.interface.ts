import {ChatInputCommandInteraction} from "discord.js"

export const TWITCH_SUB_COMMANDS = "TWITCH_SUB_COMMANDS"

export interface TwitchSubCommand {
    readonly name: string

    execute(interaction: ChatInputCommandInteraction): Promise<void>
}
