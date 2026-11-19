import "reflect-metadata"
import {expect, mock, test} from "bun:test"
import type {ChatInputCommandInteraction} from "discord.js"
import {PermissionFlagsBits} from "discord.js"
import type {BotLoggerService} from "@streamcat/core"
import {TwitchCommand} from "../src/bots/discord/commands/twitch.command"

const logger = {forModule: () => ({debug: () => {}})} as unknown as BotLoggerService

function interaction(subcommand: string, permission = 0n, userId = "member") {
    return {
        guild: {id: "guild", name: "Test server", ownerId: "owner"},
        user: {id: userId},
        memberPermissions: {has: (required: bigint) => (permission & required) === required},
        options: {getSubcommand: () => subcommand}
    } as unknown as ChatInputCommandInteraction
}

test("ordinary server members can list tracked Twitch channels", async () => {
    const execute = mock(async () => {})
    const command = new TwitchCommand(logger, [{name: "tracked", execute}])
    await command.execute(interaction("tracked"))
    expect(execute).toHaveBeenCalledTimes(1)
})

test("management commands require owner or Administrator, not ManageGuild alone", async () => {
    for (const subcommand of [
        "follow",
        "unfollow",
        "login",
        "logout",
        "post-live",
        "set-sr-reward",
        "set-main-message",
        "set-partner-message"
    ]) {
        const execute = mock(async () => {})
        const handlerName = subcommand.endsWith("-message") ? "set-message" : subcommand
        const command = new TwitchCommand(logger, [{name: handlerName, execute}])
        await expect(command.execute(interaction(subcommand))).rejects.toThrow("Only server owners and administrators")
        await expect(command.execute(interaction(subcommand, PermissionFlagsBits.ManageGuild))).rejects.toThrow(
            "Only server owners and administrators"
        )
        expect(execute).not.toHaveBeenCalled()
        await command.execute(interaction(subcommand, PermissionFlagsBits.Administrator))
        await command.execute(interaction(subcommand, 0n, "owner"))
        expect(execute).toHaveBeenCalledTimes(2)
    }
})
