import "reflect-metadata"
import {afterEach, expect, mock, spyOn, test} from "bun:test"
import {HelixEventSubApi} from "@twurple/api"
import {EventSubWsListener} from "@twurple/eventsub-ws"
import {errorDetails} from "@streamcat/core"
import {TwitchEventSubManager} from "../src/integrations/twitch/eventsub/twitch-event-sub-manager"
import {twitchSocketErrorDetails} from "../src/integrations/twitch/eventsub/twitch-socket-error"
import {checkConfiguration} from "../src/runtime/configuration"

const userId = "123456"
const follow = (guildId: string) => ({guildId, channelId: userId, username: "streamer"})
const spies: Array<{mockRestore: () => void}> = []
afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore()
})

function setup(follows = [follow("guild-a"), follow("guild-b")]) {
    const log = {info: mock(() => {}), debug: mock(() => {}), warn: mock(() => {}), error: mock(() => {})}
    const subscriptions = new Map<string, any>()
    const handlers = new Map<string, () => Promise<void>>()
    const callbacks: Record<string, (...args: any[]) => void> = {}
    const ws = {
        isActive: false,
        onSubscriptionCreateSuccess: (callback: any) => {
            callbacks.success = callback
        },
        onSubscriptionCreateFailure: (callback: any) => {
            callbacks.failure = callback
        },
        onRevoke: (callback: any) => {
            callbacks.revoke = callback
        },
        onUserSocketConnect: (callback: any) => {
            callbacks.connect = callback
        },
        onUserSocketDisconnect: (callback: any) => {
            callbacks.disconnect = callback
        },
        start: mock(() => {
            ws.isActive = true
        }),
        stop: mock(() => {
            ws.isActive = false
            subscriptions.clear()
        }),
        onStreamOnline: mock((channelId: string, handler: () => Promise<void>) => {
            const sub = {
                id: `stream.online.${channelId}`,
                authUserId: "auth-user",
                verified: false,
                stop: mock(() => {
                    subscriptions.delete(sub.id)
                })
            }
            subscriptions.set(sub.id, sub)
            handlers.set(channelId, handler)
            return sub
        }),
        onChannelRedemptionAdd: mock((channelId: string) => {
            const sub = {
                id: `redemption.${channelId}`,
                stop: mock(() => {
                    subscriptions.delete(sub.id)
                })
            }
            subscriptions.set(sub.id, sub)
            return sub
        })
    }
    const repo = {
        findAll: mock(async () => follows),
        findByChannelId: mock(async (channelId: string) => follows.filter((entry) => entry.channelId === channelId)),
        updateChannelIdByUsername: mock(async () => ({count: follows.length}))
    }
    const streamHandler = {handleStreamOnline: mock(async () => {})}
    const manager = new TwitchEventSubManager(
        repo as never,
        {
            getClient: () => ({
                users: {getUserById: async () => ({})},
                channels: {getChannelInfoById: async () => ({})}
            })
        } as never,
        {resolveUserId: async () => userId} as never,
        {forModule: () => log} as never
    )
    manager.onStreamOnline((stream) =>
        streamHandler.handleStreamOnline(
            stream.displayName,
            stream.name,
            stream.userId,
            stream.gameName,
            stream.profilePictureUrl
        )
    )
    const runtime = manager as any
    runtime.appClient = {users: {getUserById: async () => ({})}, channels: {getChannelInfoById: async () => ({})}}
    spies.push(
        spyOn(runtime, "startWebhook").mockImplementation(async () => {
            runtime.httpListener = ws
            runtime.httpReady = true
        })
    )
    spies.push(
        spyOn(runtime, "startWsListener").mockImplementation(async () => {
            runtime.wsListener = ws
            runtime.watchSubscriptionResults(ws)
            ws.start()
        })
    )
    return {manager, runtime, log, ws, callbacks, subscriptions, handlers, repo, streamHandler, follows}
}

test("startup creates one subscription object for two guild follows and stops that object only after the last unfollow", async () => {
    const state = setup()
    await Promise.all([state.manager.start(), state.manager.start()])
    expect(state.ws.onStreamOnline).toHaveBeenCalledTimes(1)
    expect(state.repo.findAll).toHaveBeenCalledTimes(1)
    const sub = state.subscriptions.get(`stream.online.${userId}`)
    expect(state.runtime.subscriptions.getSubscription(userId)).toBe(sub)
    expect(state.runtime.subscriptions.refCount(userId)).toBe(2)
    expect(state.manager.pendingStreamSubscriptionCount).toBe(1)
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    state.callbacks.success(sub, {id: "remote-id"})
    expect(state.manager.activeStreamSubscriptionCount).toBe(1)
    expect(state.manager.isReady).toBe(true)

    await state.manager.unsubscribeFromStreamer(userId)
    expect(sub.stop).not.toHaveBeenCalled()
    expect(state.subscriptions.get(sub.id)).toBe(sub)
    await state.manager.unsubscribeFromStreamer(userId)
    expect(sub.stop).toHaveBeenCalledTimes(1)
    expect(state.subscriptions.size).toBe(0)
    expect(state.runtime.subscriptions.has(userId)).toBe(false)
})

test("async subscription failure clears the failed object, reports degradation and retries with the persisted follow count", async () => {
    const state = setup()
    await state.manager.start()
    const failed = state.subscriptions.get(`stream.online.${userId}`)
    state.callbacks.failure(failed, new Error("Twitch unavailable"))
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    expect(state.manager.pendingStreamSubscriptionCount).toBe(0)
    expect(state.manager.startupState).toBe("degraded")
    expect(failed.stop).toHaveBeenCalledTimes(1)
    await state.runtime.retryFailedSubscriptions()
    const replacement = state.subscriptions.get(`stream.online.${userId}`)
    expect(replacement).not.toBe(failed)
    expect(state.runtime.subscriptions.refCount(userId)).toBe(2)
    state.callbacks.success(failed, {id: "stale-id"})
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    state.callbacks.success(replacement, {id: "new-id"})
    expect(state.manager.isReady).toBe(true)
})

test("signature mismatch drops the tracked subscription and schedules recreation", async () => {
    const state = setup()
    await state.manager.start()
    const subscription = state.subscriptions.get(`stream.online.${userId}`)
    state.runtime.handleWebhookObservation({
        subscriptionId: subscription.id,
        messageType: "notification",
        bytes: 42,
        signatureValid: false,
        ageMs: 5
    })
    expect(state.runtime.subscriptions.has(userId)).toBe(false)
    expect(subscription.stop).toHaveBeenCalledTimes(1)
    expect(state.runtime.failedSubscriptions.has(userId)).toBe(true)
    expect(state.log.warn.mock.calls.some(([message]) => String(message).includes("signature rejected"))).toBe(true)
    clearTimeout(state.runtime.retryTimer)
})

test("untracked followed subscription is deleted, Twurple cache refreshed, then recreated", async () => {
    const state = setup()
    await state.manager.start()
    const deleteSubscription = mock(async () => {})
    const markAsReady = mock(async () => {})
    state.runtime.appClient = {eventSub: {deleteSubscription}}
    state.runtime.httpListener = {...state.ws, markAsReady}
    await state.runtime.recoverUntrackedSubscription(`stream.online.${userId}`)
    expect(deleteSubscription).toHaveBeenCalledWith(`stream.online.${userId}`)
    expect(markAsReady).toHaveBeenCalledTimes(1)
    expect(state.runtime.failedSubscriptions.has(userId)).toBe(true)
    expect(state.log.info.mock.calls.some(([message]) => String(message).includes("Removed untracked"))).toBe(true)
    clearTimeout(state.runtime.retryTimer)
})

test("repeated persisted-follow reconciliation does not add reference counts or overwrite listener objects", async () => {
    const state = setup()
    await state.manager.start()
    await Promise.all([state.manager.subscribeToStreamer("streamer"), state.manager.subscribeToStreamer("streamer")])
    expect(state.ws.onStreamOnline).toHaveBeenCalledTimes(1)
    expect(state.runtime.subscriptions.refCount(userId)).toBe(2)
})

test("revoked subscriptions can be recreated and stale revocations leave replacements intact", async () => {
    const state = setup()
    await state.manager.start()
    state.manager.subscribeToRedemption(userId, "guild-a")
    const oldRedemption = state.subscriptions.get(`redemption.${userId}`)
    state.callbacks.revoke(oldRedemption, "authorization_revoked")
    state.manager.subscribeToRedemption(userId, "guild-a")
    const replacement = state.subscriptions.get(`redemption.${userId}`)
    expect(replacement).not.toBe(oldRedemption)
    state.callbacks.revoke(oldRedemption, "authorization_revoked")
    expect(state.runtime.redemptionSubscriptions.get("guild-a").subscription).toBe(replacement)

    const oldStream = state.subscriptions.get(`stream.online.${userId}`)
    state.callbacks.revoke(oldStream, "authorization_revoked")
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    expect(state.runtime.subscriptions.has(userId)).toBe(false)
    await state.manager.subscribeToStreamer("streamer")
    const stream = state.subscriptions.get(`stream.online.${userId}`)
    state.callbacks.revoke(oldStream, "authorization_revoked")
    state.callbacks.success(stream, {id: "replacement"})
    state.callbacks.success(replacement, {id: "replacement-redemption"})
    state.runtime.connectedWsUsers.add(userId)
    expect(state.manager.isReady).toBe(true)
})

test("socket diagnostics expose close and HTTP codes without remote messages or credentials", () => {
    const error = Object.assign(new Error("[4005] private-token https://secret.example/callback?code=private"), {
        statusCode: 429
    })
    const details = twitchSocketErrorDetails(error)
    expect(details).toContain("close_code=4005 close_reason=network_timeout")
    expect(details).toContain("error_status=429")
    expect(details).not.toContain("private")
    expect(details).not.toContain("secret.example")
    expect(twitchSocketErrorDetails(new Error("[1006] unexpected closure"))).toContain("close_reason=abnormal_closure")
    expect(twitchSocketErrorDetails()).toBe("close_code=unknown close_reason=not_reported")
    expect(errorDetails(new Error("sensitive", {cause: error}))).toContain("cause_status=429")
})

test("redemption readiness follows welcome and subscription confirmation across reconnects without touching webhooks", async () => {
    const state = setup()
    state.runtime.startWsListener.mockRestore()
    state.runtime.twitchAuth.ensureInitialized = async () => ({client: {}})
    const redemption = {id: "redemption", stop: mock(() => {})}
    const stop = spyOn(EventSubWsListener.prototype, "stop").mockImplementation(function (this: EventSubWsListener) {
        this.emit(this.onUserSocketDisconnect, userId)
    })
    const subscribe = spyOn(EventSubWsListener.prototype, "onChannelRedemptionAdd").mockReturnValue(redemption as never)
    const clock = spyOn(Date, "now").mockReturnValue(1000)
    spies.push(stop, subscribe, clock)
    await state.manager.start()
    state.runtime.watchSubscriptionResults(state.ws)
    const stream = state.subscriptions.get(`stream.online.${userId}`)
    state.callbacks.success(stream)
    state.manager.subscribeToRedemption(userId, "guild-a")
    const listener = state.runtime.wsListener as EventSubWsListener
    listener.emit(listener.onUserSocketConnect, userId)
    expect(state.manager.isWebSocketConnected).toBe(false)
    expect(state.manager.isReady).toBe(false)
    listener.emit(listener.onUserSocketReady, userId, "test-session")
    expect(state.manager.isWebSocketConnected).toBe(true)
    expect(state.manager.isReady).toBe(false)
    listener.emit(listener.onSubscriptionCreateSuccess, redemption as never, {} as never)
    expect(state.manager.isReady).toBe(true)

    listener.emit(listener.onUserSocketDisconnect, userId, new Error("[4005] Network timeout"))
    expect(state.manager.isReady).toBe(false)
    expect(state.manager.isWebSocketConnected).toBe(false)
    expect(state.manager.activeStreamSubscriptionCount).toBe(1)
    expect(state.log.warn.mock.calls.at(-1)?.[0]).toContain("close_code=4005 close_reason=network_timeout")
    clock.mockReturnValue(1500)
    listener.emit(listener.onUserSocketConnect, userId)
    listener.emit(listener.onUserSocketReady, userId, "replacement-session")
    expect(state.manager.isReady).toBe(false)
    expect(state.log.info.mock.calls.at(-1)?.[0]).toContain("recovered_after_ms=500")
    listener.emit(listener.onSubscriptionCreateSuccess, redemption as never, {} as never)
    expect(state.manager.isReady).toBe(true)
    expect(subscribe).toHaveBeenCalledTimes(1)
    const warningCount = state.log.warn.mock.calls.length
    await state.manager.onModuleDestroy()
    expect(state.log.warn).toHaveBeenCalledTimes(warningCount)
})

test("shutdown clears stream/redemption state, ignores old callbacks and supports a clean restart", async () => {
    const state = setup()
    await state.manager.start()
    state.manager.subscribeToRedemption(userId, "guild-a")
    expect(state.runtime.redemptionSubscriptions.size).toBe(1)
    const oldStream = state.subscriptions.get(`stream.online.${userId}`)
    const oldHandler = state.handlers.get(userId)!
    await state.manager.onModuleDestroy()
    expect(state.ws.stop).toHaveBeenCalledTimes(1)
    expect(state.manager.startupState).toBe("stopped")
    expect(state.runtime.redemptionSubscriptions.size).toBe(0)
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    expect(state.manager.pendingStreamSubscriptionCount).toBe(0)
    await oldHandler()
    expect(state.streamHandler.handleStreamOnline).not.toHaveBeenCalled()
    state.callbacks.success(oldStream, {id: "stale"})
    expect(state.manager.activeStreamSubscriptionCount).toBe(0)
    await state.manager.start()
    expect(state.ws.onStreamOnline).toHaveBeenCalledTimes(2)
    expect(state.runtime.subscriptions.refCount(userId)).toBe(2)
})

test("failed listener startup remains stopped and a subsequent startup can retry", async () => {
    const state = setup([])
    state.runtime.startWsListener.mockResolvedValue(undefined)
    await state.manager.start()
    expect(state.manager.isWebSocketActive).toBe(false)
    expect(state.manager.isReady).toBe(false)
    expect(state.manager.startupState).toBe("degraded")
    expect(state.runtime.started).toBe(false)
    state.runtime.startWsListener.mockImplementation(async () => {
        state.runtime.wsListener = state.ws
        state.runtime.watchSubscriptionResults(state.ws)
        state.ws.start()
    })
    await state.manager.start()
    expect(state.manager.isWebSocketActive).toBe(true)
})

// Exercise the middleware lifecycle without opening a socket or calling Twitch.
test("webhooks share the HTTP router and preserve remote subscriptions on shutdown", async () => {
    const state = setup()
    state.runtime.startWebhook.mockRestore()
    const environment = {
        PUBLIC_URL: "https://hooks.example.test",
        EVENTSUB_SECRET: "test-webhook-secret",
        TWITCH_APP_CLIENT_ID: "test-client",
        TWITCH_APP_SECRET: "test-secret"
    }
    const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]))
    Object.assign(process.env, environment)
    const router = {use: mock(() => {}), post: mock(() => {}), get: mock(() => {})}
    const existing = {
        id: "existing-webhook",
        status: "enabled",
        _transport: {method: "webhook", callback: `https://hooks.example.test/eventsub/event/stream.online.${userId}`}
    }
    let completeResume!: (subscriptions: (typeof existing)[]) => void
    const resume = new Promise<(typeof existing)[]>((resolve) => {
        completeResume = resolve
    })
    const create = spyOn(HelixEventSubApi.prototype, "createSubscription").mockRejectedValue(
        new Error("Must reuse existing webhook")
    )
    const remove = spyOn(HelixEventSubApi.prototype, "deleteSubscription").mockResolvedValue(undefined)
    spies.push(
        create,
        remove,
        spyOn(HelixEventSubApi.prototype, "getSubscriptionsPaginated").mockReturnValue({getAll: () => resume} as never)
    )
    try {
        state.manager.attachWebhook(router as never)
        let finished = false
        const startup = state.manager.start().then(() => {
            finished = true
        })
        const ready = state.manager.markWebhookReady()
        await Promise.resolve()
        expect(finished).toBe(false)
        expect(router.use.mock.calls[0][0]).toBe("/eventsub")
        expect(router.post.mock.calls[0][0]).toBe("/eventsub/event/:id")
        const listener = state.runtime.httpListener
        expect(listener._strictHostCheck).toBe(false)
        completeResume([existing])
        await ready
        await startup
        const removed = mock(() => {})
        listener._subscriptions.set("persisted", {suspend: removed, stop: removed})
        expect(state.manager.isWebhookActive).toBe(true)
        expect(state.manager.webhookUrl).toBe("https://hooks.example.test/eventsub")
        expect(state.manager.activeStreamSubscriptionCount).toBe(1)
        expect(create).not.toHaveBeenCalled()
        await state.manager.onModuleDestroy()
        expect(removed).not.toHaveBeenCalled()
        expect(remove).not.toHaveBeenCalled()
        expect(state.manager.isWebhookActive).toBe(false)
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
        }
    }
})

test("startup removes webhook subscriptions for channels no guild follows anymore", async () => {
    const state = setup()
    state.runtime.startWebhook.mockRestore()
    const environment = {
        PUBLIC_URL: "https://hooks.example.test",
        EVENTSUB_SECRET: "test-webhook-secret",
        TWITCH_APP_CLIENT_ID: "test-client",
        TWITCH_APP_SECRET: "test-secret"
    }
    const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]))
    Object.assign(process.env, environment)
    const router = {use: mock(() => {}), post: mock(() => {}), get: mock(() => {})}
    const callback = (channelId: string) => `https://hooks.example.test/eventsub/event/stream.online.${channelId}`
    const remote = (channelId: string) => ({
        id: `stream.online.${channelId}`,
        type: "stream.online",
        status: "enabled",
        transportMethod: "webhook",
        condition: {broadcaster_user_id: channelId},
        _transport: {method: "webhook", callback: callback(channelId)}
    })
    const followed = remote(userId)
    const orphan = remote("999999")
    const remove = spyOn(HelixEventSubApi.prototype, "deleteSubscription").mockResolvedValue(undefined)
    spies.push(
        remove,
        spyOn(HelixEventSubApi.prototype, "createSubscription").mockRejectedValue(
            new Error("Must reuse existing webhook")
        ),
        spyOn(HelixEventSubApi.prototype, "getSubscriptionsPaginated").mockReturnValue({
            getAll: async () => [followed, orphan]
        } as never)
    )
    try {
        state.manager.attachWebhook(router as never)
        await state.manager.markWebhookReady()
        await state.manager.start()
        expect(remove).toHaveBeenCalledTimes(1)
        expect(remove).toHaveBeenCalledWith(orphan.id)
        expect(state.manager.isWebhookActive).toBe(true)
        expect(state.manager.activeStreamSubscriptionCount).toBe(1)
        expect(state.log.info.mock.calls.some(([message]) => String(message).includes("Removed orphaned"))).toBe(true)
        expect(state.log.info.mock.calls.some(([message]) => String(message).includes("kept=1 removed=1"))).toBe(true)
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
        }
    }
})

test("configuration rejects obsolete HOST and invalid webhook origins before starting providers", () => {
    const environment = {
        DISCORD_TOKEN: "test",
        AUTH_DISCORD_ID: "test",
        AUTH_DISCORD_SECRET: "test",
        AUTH_SECRET: "test",
        TWITCH_APP_CLIENT_ID: "test",
        TWITCH_APP_SECRET: "test",
        DB_PASSWORD: "test",
        PUBLIC_URL: "",
        HOST: "hooks.example.test",
        EVENTSUB_SECRET: "test-webhook-secret",
        S3_ACCESS_KEY_ID: "test-storage-key",
        S3_SECRET_ACCESS_KEY: "test-storage-secret"
    }
    const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]))
    Object.assign(process.env, environment)
    try {
        expect(checkConfiguration).toThrow("HOST has been replaced by PUBLIC_URL")
        delete process.env.HOST
        for (const origin of [
            "http://127.0.0.1:3000",
            "https://127.0.0.1",
            "https://[::1]",
            "https://hooks.example.test:3000"
        ]) {
            process.env.PUBLIC_URL = origin
            expect(checkConfiguration).toThrow("Live notifications require a public HTTPS PUBLIC_URL on port 443")
        }
        process.env.PUBLIC_URL = "https://hooks.example.test"
        expect(checkConfiguration).not.toThrow()
        process.env.PUBLIC_URL = "http://127.0.0.1:3000"
        delete process.env.EVENTSUB_SECRET
        expect(checkConfiguration).toThrow("Missing configuration: EVENTSUB_SECRET")
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
        }
    }
})
