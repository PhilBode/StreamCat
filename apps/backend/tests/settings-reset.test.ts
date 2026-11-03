import "reflect-metadata"
import {expect, mock, test} from "bun:test"
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction} from "discord.js"
import {SettingsConfirmHandler} from "../src/bots/discord/interactions/settings-confirm.handler"
import {TwitchConnectionService} from "../src/features/account-linking/providers/twitch-connection.service"

function setup(error?: unknown) {
    const log = {debug: mock(() => {}), info: mock(() => {})}
    const spotify = {
        delete: mock(async () => {
            if (error) throw error
        })
    }
    const spotifyService = {removeGuildInstance: mock(() => {})}
    const twitchBot = {removeGuildFollows: mock(async () => {}), removeGuildAuth: mock(async () => {})}
    const interaction = {
        user: {id: "admin"},
        deferred: true,
        deferUpdate: mock(async () => {}),
        editReply: mock(async () => {}),
        guild: {id: "guild", name: "Test guild", leave: mock(async () => {})},
        message: {
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("confirm").setLabel("Confirm").setStyle(ButtonStyle.Danger)
                )
            ]
        },
        update: mock(async () => {}),
        reply: mock(async () => {})
    } as unknown as ButtonInteraction
    const handler = new SettingsConfirmHandler(
        {forModule: () => log} as never,
        {requireAdmin: async () => {}} as never,
        {delete: async () => {}} as never,
        spotify as never,
        twitchBot as never,
        spotifyService as never
    )
    return {handler, interaction, spotifyService, twitchBot, log}
}

test("removing guild auth still reconciles chat after a guild cascade deleted the auth record", async () => {
    const reconcile = mock(async () => {})
    const unsubscribeFromRedemptions = mock(() => {})
    const deleteAuth = mock(async () => {})
    const connection = new TwitchConnectionService(
        {} as never,
        {findByGuildId: async () => null, delete: deleteAuth} as never,
        {} as never,
        {} as never,
        {reconcile} as never,
        {forModule: () => ({info: mock(() => {})})} as never,
        {unsubscribeFromRedemptions} as never,
        {} as never,
        {} as never
    )
    await connection.removeGuildAuth("deleted-guild")
    expect(unsubscribeFromRedemptions).toHaveBeenCalledWith("deleted-guild")
    expect(deleteAuth).toHaveBeenCalledWith("deleted-guild")
    expect(reconcile).toHaveBeenCalledTimes(1)
})

for (const action of ["reset-spotify", "reset-server"]) {
    test(`${action} tolerates a missing Spotify record (P2025)`, async () => {
        const state = setup({code: "P2025"})
        await state.handler.execute(state.interaction, `settings:confirm:guild:${action}`)
        expect(state.spotifyService.removeGuildInstance).toHaveBeenCalledWith("guild")
        expect(state.interaction.editReply).toHaveBeenCalledTimes(1)
        expect(state.log.debug).toHaveBeenCalledWith("No Spotify config to delete for guild guild")
        expect(state.log.info).toHaveBeenCalledTimes(1)
    })

    test(`${action} propagates a database outage without reporting reset success`, async () => {
        const outage = Object.assign(new Error("Database unavailable"), {code: "P1001"})
        const state = setup(outage)
        await expect(state.handler.execute(state.interaction, `settings:confirm:guild:${action}`)).rejects.toBe(outage)
        expect(state.spotifyService.removeGuildInstance).not.toHaveBeenCalled()
        expect(state.twitchBot.removeGuildAuth).not.toHaveBeenCalled()
        expect(state.interaction.editReply).not.toHaveBeenCalled()
        expect(state.interaction.guild?.leave).not.toHaveBeenCalled()
        expect(state.log.info).not.toHaveBeenCalled()
        expect(state.log.debug).not.toHaveBeenCalled()
    })
}
