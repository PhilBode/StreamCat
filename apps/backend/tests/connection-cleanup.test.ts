import "reflect-metadata"
import {expect, mock, test} from "bun:test"
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction} from "discord.js"
import {SpotifyConfigRepository, TwitchAuthRepository} from "@streamcat/db"
import {DisconnectConfirmHandler} from "../src/bots/discord/interactions/disconnect-confirm.handler"

test("Twitch auth deletion clears auth, rewards, song requests and the main follow in one transaction", async () => {
    const calls: Record<string, unknown> = {}
    const prisma = {
        twitchAuth: {deleteMany: mock(async (args: unknown) => ((calls.auth = args), {count: 1}))},
        twitchReward: {deleteMany: mock(async (args: unknown) => ((calls.rewards = args), {count: 1}))},
        songRequestConfig: {deleteMany: mock(async (args: unknown) => ((calls.songRequests = args), {count: 1}))},
        twitchConfig: {deleteMany: mock(async (args: unknown) => ((calls.follow = args), {count: 1}))},
        $transaction: mock(async (operations: Promise<unknown>[]) => Promise.all(operations))
    }
    const repository = new TwitchAuthRepository(prisma as never, {} as never)

    await repository.deleteConnection("guild")

    expect(calls.auth).toEqual({where: {guildId: "guild"}})
    expect(calls.rewards).toEqual({where: {guildId: "guild"}})
    expect(calls.songRequests).toEqual({where: {guildId: "guild"}})
    expect(calls.follow).toEqual({where: {guildId: "guild", mainStream: true}})
})

test("Spotify deletion reports whether saved credentials existed", async () => {
    let count = 1
    const prisma = {
        spotifyConfig: {deleteMany: mock(async () => ({count}))}
    }
    const repository = new SpotifyConfigRepository(prisma as never, {} as never)

    expect(await repository.delete("guild")).toBe(true)
    count = 0
    expect(await repository.delete("guild")).toBe(false)
})

function interaction(customId: string): ButtonInteraction {
    return {
        customId,
        guild: {id: "guild"},
        guildId: "guild",
        user: {id: "admin"},
        memberPermissions: {has: () => true},
        deferred: true,
        deferUpdate: mock(async () => {}),
        editReply: mock(async () => {}),
        message: {
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("confirm").setLabel("Confirm").setStyle(ButtonStyle.Danger)
                )
            ]
        }
    } as unknown as ButtonInteraction
}

test("Discord confirm button removes the selected connection", async () => {
    const removeTwitch = mock(async () => true)
    const removeSpotify = mock(async () => true)
    const handler = new DisconnectConfirmHandler(
        {forModule: () => ({info: mock(() => {})})} as never,
        {removeGuildAuth: removeTwitch} as never,
        {disconnectGuild: removeSpotify} as never
    )

    const twitch = interaction("disconnect:confirm:guild:twitch")
    await handler.execute(twitch, twitch.customId)
    expect(removeTwitch).toHaveBeenCalledWith("guild")
    expect(removeSpotify).not.toHaveBeenCalled()
    expect(twitch.editReply).toHaveBeenCalledWith(
        expect.objectContaining({content: "✅ Twitch disconnected. Saved connection data was deleted."})
    )

    const spotify = interaction("disconnect:confirm:guild:spotify")
    await handler.execute(spotify, spotify.customId)
    expect(removeSpotify).toHaveBeenCalledWith("guild")
    expect(spotify.editReply).toHaveBeenCalledWith(
        expect.objectContaining({content: "✅ Spotify disconnected. Saved connection data was deleted."})
    )
})
