import "reflect-metadata"
import {expect, mock, spyOn, test} from "bun:test"
import {EventSubWsListener} from "@twurple/eventsub-ws"
import {TwitchChatClient} from "../src/integrations/twitch/chat/twitch-chat-client"

test("chat distinguishes socket connect from session readiness and logs safe recovery without duplicating subscriptions", async () => {
    const log = {info: mock(() => {}), debug: mock(() => {}), warn: mock(() => {}), error: mock(() => {})}
    const runtime = {userId: "bot-user", client: {}}
    const subscription = {id: "chat.channel", stop: mock(() => {})}
    const start = spyOn(EventSubWsListener.prototype, "start").mockImplementation(() => {})
    const stop = spyOn(EventSubWsListener.prototype, "stop").mockImplementation(function (this: EventSubWsListener) {
        this.emit(this.onUserSocketDisconnect, runtime.userId)
    })
    const subscribe = spyOn(EventSubWsListener.prototype, "onChannelChatMessage").mockReturnValue(subscription as never)
    const clock = spyOn(Date, "now").mockReturnValue(1000)
    const chat = new TwitchChatClient(
        {start: async () => {}, getRuntime: () => runtime} as never,
        {findAssignedGuilds: async () => [{channelId: "channel"}]} as never,
        {forModule: () => log} as never
    )
    try {
        await chat.start()
        const listener = (chat as unknown as {listener: EventSubWsListener}).listener
        listener.emit(listener.onUserSocketConnect, runtime.userId)
        expect(log.debug.mock.calls.at(-1)?.[0]).toContain("awaiting_welcome=true")
        listener.emit(listener.onUserSocketReady, runtime.userId, "first-session")
        expect(log.info.mock.calls.at(-1)?.[0]).toContain("session ready user=bot-user")
        listener.emit(listener.onUserSocketDisconnect, runtime.userId, new Error("[1006] private-token"))
        const warning = log.warn.mock.calls.at(-1)?.[0]
        expect(warning).toContain("user=bot-user channels=1 reconnect=automatic close_code=1006")
        expect(warning).not.toContain("private-token")
        clock.mockReturnValue(1700)
        listener.emit(listener.onUserSocketReady, runtime.userId, "second-session")
        expect(log.info.mock.calls.at(-1)?.[0]).toContain("recovered_after_ms=700")
        listener.emit(listener.onSubscriptionCreateSuccess, subscription as never, {} as never)
        expect(log.info.mock.calls.at(-1)?.[0]).toContain("subscription confirmed channel=channel")
        expect(start).toHaveBeenCalledTimes(1)
        expect(subscribe).toHaveBeenCalledTimes(1)
        await chat.onModuleDestroy()
        expect(log.warn).toHaveBeenCalledTimes(1)
    } finally {
        await chat.onModuleDestroy()
        clock.mockRestore()
        subscribe.mockRestore()
        stop.mockRestore()
        start.mockRestore()
    }
})
