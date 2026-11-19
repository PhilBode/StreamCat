import "reflect-metadata"
import {expect, mock, test} from "bun:test"
import {TwitchConnectionService} from "../src/features/account-linking/providers/twitch-connection.service"
import {AccountAlreadyLinkedError} from "../src/features/account-linking/helpers/account-already-linked-error"
import type {AuthResult} from "../src/features/account-linking/services/oauth-flow.service"

const result: AuthResult = {
    userId: "twitch-user",
    username: "streamer",
    accessToken: "access",
    refreshToken: "refresh",
    expiresIn: 3600,
    scope: "user:read:email"
}

const logger = {forModule: () => ({info: () => {}, warn: () => {}, error: () => {}})} as never

function service(authRepo: object, save = mock(async () => {})) {
    return new TwitchConnectionService(
        {} as never,
        {save, ...authRepo} as never,
        {findByGuildId: async () => []} as never,
        {assignChannel: async () => true} as never,
        {} as never,
        logger,
        {} as never,
        {} as never,
        {} as never
    )
}

test("rejects a Twitch account that is already linked to another guild", async () => {
    const save = mock(async () => {})
    const connection = service(
        {findIdentityByUserId: async () => ({guildId: "other-guild", userId: result.userId})},
        save
    )

    await expect(connection.createAuthorizationOptions("guild").complete(result)).rejects.toBeInstanceOf(
        AccountAlreadyLinkedError
    )
    expect(save).not.toHaveBeenCalled()
})

test("maps a unique constraint race to the same account error", async () => {
    const save = mock(async () => {
        throw Object.assign(new Error("Unique constraint failed"), {code: "P2002"})
    })
    const connection = service({findIdentityByUserId: async () => null}, save)

    await expect(connection.createAuthorizationOptions("guild").complete(result)).rejects.toBeInstanceOf(
        AccountAlreadyLinkedError
    )
})
