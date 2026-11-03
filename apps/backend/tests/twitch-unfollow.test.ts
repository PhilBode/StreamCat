import type {TwitchConfigRecord, TwitchConfigRepository} from "@streamcat/db"
import "reflect-metadata"
import {expect, mock, test} from "bun:test"
import type {ChatInputCommandInteraction} from "discord.js"
import type {EventSubSubscription} from "@twurple/eventsub-base"
import type {BotLoggerService} from "@streamcat/core"

import {UnfollowSubCommand} from "../src/bots/discord/commands/twitch/unfollow.sub-command"
import {StreamerFollowService} from "../src/features/stream-notifications/streamer-follow.service"
import {TwitchSubscriptionService} from "../src/integrations/twitch/eventsub/twitch-subscription.service"

const twitchUserId = "123456"
const username = "streamer"
const logger = {forModule: () => ({info: () => {}, debug: () => {}})} as unknown as BotLoggerService

function setup(options: {mainStream?: boolean; failDelete?: boolean} = {}) {
    const follows = new Map<string, TwitchConfigRecord>(
        ["guild-a", "guild-b"].map((guildId, index) => [
            guildId,
            {
                id: index + 1,
                guildId,
                username,
                channelId: twitchUserId,
                mainStream: options.mainStream ?? false
            }
        ])
    )
    const repository = {
        findByGuildIdAndUsername: mock(async (guildId: string, requestedUsername: string) => {
            const follow = follows.get(guildId)
            return follow?.username === requestedUsername ? follow : null
        }),
        delete: mock(async (guildId: string) => {
            if (options.failDelete) throw new Error("Database unavailable")
            const follow = follows.get(guildId)
            follows.delete(guildId)
            return follow
        })
    }
    const subscriptions = new TwitchSubscriptionService()
    subscriptions.register(twitchUserId, {id: "stream.online.123456"} as EventSubSubscription)
    subscriptions.increment(twitchUserId)
    const runtime = {
        resolveUserId: mock(async () => twitchUserId),
        unsubscribeFromStreamer: mock(async (userId: string) => {
            subscriptions.unsubscribe(userId)
        })
    }
    const service = new StreamerFollowService(
        repository as unknown as TwitchConfigRepository,
        {getUserByName: async () => ({id: twitchUserId})} as never,
        runtime as never,
        logger
    )
    const command = new UnfollowSubCommand(service)
    function interaction(guildId: string, requestedUsername = "Streamer") {
        return {
            guild: {id: guildId},
            options: {getString: () => requestedUsername},
            reply: mock(async () => {})
        } as unknown as ChatInputCommandInteraction
    }
    return {command, interaction, repository, runtime, subscriptions, follows}
}

test("unfollow accepts the name, removes exactly one reference and keeps another guild's follow", async () => {
    const state = setup()
    const first = state.interaction("guild-a")
    await state.command.execute(first)

    expect(state.repository.findByGuildIdAndUsername).toHaveBeenCalledWith("guild-a", username)
    expect(state.runtime.resolveUserId).not.toHaveBeenCalled()
    expect(state.runtime.unsubscribeFromStreamer).toHaveBeenCalledTimes(1)
    expect(state.runtime.unsubscribeFromStreamer).toHaveBeenCalledWith(twitchUserId)
    expect(state.follows.has("guild-a")).toBe(false)
    expect(state.follows.has("guild-b")).toBe(true)
    expect(state.subscriptions.refCount(twitchUserId)).toBe(1)
    expect(state.subscriptions.has(twitchUserId)).toBe(true)
    expect(first.reply).toHaveBeenCalledTimes(1)

    await state.command.execute(state.interaction("guild-b"))
    expect(state.runtime.unsubscribeFromStreamer).toHaveBeenCalledTimes(2)
    expect(state.subscriptions.has(twitchUserId)).toBe(false)
})

test("unfollow does not change runtime when the database deletion fails", async () => {
    const state = setup({failDelete: true})
    const interaction = state.interaction("guild-a")
    await expect(state.command.execute(interaction)).rejects.toThrow("Database unavailable")
    expect(state.runtime.unsubscribeFromStreamer).not.toHaveBeenCalled()
    expect(state.subscriptions.refCount(twitchUserId)).toBe(2)
    expect(interaction.reply).not.toHaveBeenCalled()
})

test("unfollow still rejects the main streamer", async () => {
    const state = setup({mainStream: true})
    await expect(state.command.execute(state.interaction("guild-a"))).rejects.toThrow("You cannot unfollow yourself")
    expect(state.repository.delete).not.toHaveBeenCalled()
    expect(state.runtime.unsubscribeFromStreamer).not.toHaveBeenCalled()
})

test("unfollow still rejects a name the guild does not follow", async () => {
    const state = setup()
    await expect(state.command.execute(state.interaction("guild-a", "unknown"))).rejects.toThrow("Guild never followed")
    expect(state.repository.delete).not.toHaveBeenCalled()
    expect(state.runtime.unsubscribeFromStreamer).not.toHaveBeenCalled()
})
