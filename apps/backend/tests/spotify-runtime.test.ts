import type {
    SpotifyConfigInput,
    SpotifyConfigRecord,
    SpotifyConfigRepository,
    GuildConfigRepository,
    TwitchConfigRepository,
    SongRequestRepository,
    TwitchAuthRepository
} from "@streamcat/db"
import "reflect-metadata"
import {afterEach, expect, spyOn, test} from "bun:test"
import SpotifyWebApi from "spotify-web-api-node"
import type {ChatInputCommandInteraction} from "discord.js"

import {BotLoggerService} from "@streamcat/core"
import {SpotifyService} from "../src/integrations/spotify/spotify.service"
import {StatusCommand} from "../src/bots/discord/commands/status.command"
import {SpotifySongRequestHandler} from "../src/bots/twitch/redemptions/spotify-song-request.handler"
import {SongRequestService} from "../src/features/song-requests/song-request.service"
import {GuildSpotifyInstance} from "../src/integrations/spotify/playback/guild-spotify-instance"
import type {ModuleLogger} from "@streamcat/core"

const logger = {
    forModule: () => ({info: () => {}, warn: () => {}, error: () => {}, debug: () => {}})
} as unknown as BotLoggerService
const config: SpotifyConfigRecord = {
    guildId: "100",
    clientId: "a".repeat(32),
    clientSecret: "test-secret",
    username: "Streamer",
    accessToken: "test-access",
    refreshToken: "test-refresh",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 3600_000),
    scope: "user-read-playback-state"
}
const track = {name: "Test song", artists: [{name: "Test artist"}], album: {images: []}, uri: "spotify:track:123"}
let bot: SpotifyService
let playback: ReturnType<typeof spyOn> | undefined
let getTrack: ReturnType<typeof spyOn> | undefined
let enqueue: ReturnType<typeof spyOn> | undefined
let refresh: ReturnType<typeof spyOn> | undefined
afterEach(async () => {
    playback?.mockRestore()
    getTrack?.mockRestore()
    enqueue?.mockRestore()
    refresh?.mockRestore()
    await bot?.onModuleDestroy()
})

function setup() {
    let saved: SpotifyConfigRecord | null = null
    let reads = 0
    const repo = {
        findAll: async () => (saved ? [saved] : []),
        countConfiguredAccounts: async () => (saved ? 1 : 0),
        findAccountInfoByGuildId: async () => (saved ? {username: saved.username, clientId: saved.clientId} : null),
        findByGuildId: async (guildId: string) => {
            reads++
            return saved?.guildId === guildId ? saved : null
        },
        save: async (guildId: string, data: SpotifyConfigInput) => {
            saved = {guildId, ...data, expiresAt: new Date(Date.now() + data.expiresIn * 1000)}
            return saved
        },
        updateTokens: async () => {}
    } as unknown as SpotifyConfigRepository
    bot = new SpotifyService(repo, logger)
    return {
        repo,
        save: (record = config) => {
            saved = record
        },
        reads: () => reads
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((complete, fail) => {
        resolve = complete
        reject = fail
    })
    return {promise, resolve, reject}
}

const newConnection: SpotifyConfigInput = {
    ...config,
    accessToken: "reauth-access",
    refreshToken: "reauth-refresh",
    expiresIn: 3600
}

test("profile pictures restore saved Spotify sessions, refresh expired access and tolerate missing images or outages", async () => {
    const state = setup()
    state.save()
    const profile = spyOn(SpotifyWebApi.prototype, "getMe")
        .mockRejectedValueOnce({statusCode: 401})
        .mockResolvedValue({
            body: {id: "listener", display_name: "Listener", images: [{url: "https://i.scdn.co/image/profile"}]}
        } as never)
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockResolvedValue({
        body: {access_token: "new-access", expires_in: 3600}
    } as never)
    try {
        expect(await bot.getProfilePictureUrl("100")).toBe("https://i.scdn.co/image/profile")
        expect(refresh).toHaveBeenCalledTimes(1)
        profile.mockResolvedValue({body: {id: "listener", display_name: "Listener", images: []}} as never)
        expect(await bot.getProfilePictureUrl("100")).toBeNull()
        profile.mockRejectedValue({statusCode: 503})
        expect(await bot.getProfilePictureUrl("100")).toBeNull()
    } finally {
        profile.mockRestore()
    }
})

test("queue restores the guild session, refreshes once on 401 and returns upcoming tracks with covers", async () => {
    const state = setup()
    state.save()
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockResolvedValue({
        body: {access_token: "new-access", expires_in: 3600}
    } as never)
    const request = spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({}, {status: 401}))
        .mockResolvedValue(
            Response.json({
                currently_playing: {name: "Already playing"},
                queue: [
                    {...track, type: "track", album: {images: [{url: "https://example.com/cover.jpg"}]}},
                    {...track, type: "track", name: "Without cover", album: {images: []}},
                    {type: "episode", name: "Podcast"}
                ]
            })
        )
    try {
        expect(await bot.getQueue("100")).toEqual({
            connected: true,
            tracks: [
                {uri: track.uri, name: track.name, artists: ["Test artist"], coverUrl: "https://example.com/cover.jpg"},
                {uri: track.uri, name: "Without cover", artists: ["Test artist"], coverUrl: null}
            ]
        })
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(request.mock.calls[1][1]?.headers).toEqual({Authorization: "Bearer new-access"})
        expect(await bot.getQueue("200")).toEqual({connected: false, tracks: []})
        expect(request).toHaveBeenCalledTimes(2)
        request.mockResolvedValue(Response.json({queue: []}))
        expect(await bot.getQueue("100")).toEqual({connected: true, tracks: []})
        request.mockResolvedValue(Response.json({}, {status: 429}))
        await expect(bot.getQueue("100")).rejects.toThrow("Die Spotify-Queue konnte nicht geladen werden")
        request.mockResolvedValue(Response.json({queue: null}))
        await expect(bot.getQueue("100")).rejects.toThrow("Die Spotify-Queue konnte nicht geladen werden")
    } finally {
        request.mockRestore()
    }
})

test("status restores a connection saved after startup and reports the track and runtime count", async () => {
    const state = setup()
    await bot.init()
    expect(bot.instanceCount).toBe(0)
    state.save()
    playback = spyOn(SpotifyWebApi.prototype, "getMyCurrentPlaybackState").mockResolvedValue({
        body: {item: track}
    } as never)
    const command = new StatusCommand(
        bot,
        {findByGuildIdWithNotifications: async () => null} as unknown as GuildConfigRepository,
        {findByGuildId: async () => []} as unknown as TwitchConfigRepository,
        state.repo,
        {startupState: "ready"} as never,
        {summary: async () => "Up to date."} as never
    )
    let fields: Array<{name: string; value: string}> = []
    const interaction = {
        guild: {id: "100", name: "Test server"},
        client: {guilds: {cache: {size: 1}}},
        deferReply: async () => {},
        editReply: async ({embeds}: any) => {
            fields = embeds[0].data.fields
        }
    } as unknown as ChatInputCommandInteraction
    await command.execute(interaction)
    expect(bot.hasGuildInstance("100")).toBe(true)
    expect(fields.find((field) => field.name === "Spotify")?.value).toContain("Test artist - Test song")
    expect(fields.find((field) => field.name === "Bot")?.value).toContain("(**1** active)")
    const readsAfterRestore = state.reads()
    await bot.getCurrentlyPlaying("100")
    expect(state.reads()).toBe(readsAfterRestore)
})

test("song requests use the same restore path and cannot use another guild's connection", async () => {
    const state = setup()
    await bot.init()
    state.save()
    getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockResolvedValue({body: track} as never)
    enqueue = spyOn(SpotifyWebApi.prototype, "addToQueue").mockResolvedValue({body: {}} as never)
    expect((await bot.tryToAddSongToQueue("spotify:track:123", "100")).success).toBe(true)
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(await bot.tryToAddSongToQueue("spotify:track:123", "200")).toEqual({success: false})
    expect(enqueue).toHaveBeenCalledTimes(1)
})

test("a failed refresh prevents queue calls and removes the restored instance", async () => {
    const state = setup()
    state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockRejectedValue({statusCode: 401})
    getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockResolvedValue({body: track} as never)
    enqueue = spyOn(SpotifyWebApi.prototype, "addToQueue").mockResolvedValue({body: {}} as never)

    await expect(bot.tryToAddSongToQueue("spotify:track:123", "100")).rejects.toThrow(
        "Spotify session could not be refreshed"
    )
    expect(getTrack).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
    expect(bot.hasGuildInstance("100")).toBe(false)

    refresh.mockResolvedValue({body: {access_token: "new-access", expires_in: 3600}} as never)
    expect((await bot.tryToAddSongToQueue("spotify:track:123", "100")).success).toBe(true)
    expect(bot.hasGuildInstance("100")).toBe(true)
})

test("parallel requests share restoration and wait for the expired token refresh", async () => {
    const state = setup()
    state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
    let completeRefresh!: (result: never) => void
    let refreshStarted!: () => void
    const started = new Promise<void>((resolve) => {
        refreshStarted = resolve
    })
    const refreshResult = new Promise<never>((resolve) => {
        completeRefresh = resolve
    })
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
        refreshStarted()
        return refreshResult
    })
    getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockResolvedValue({body: track} as never)
    enqueue = spyOn(SpotifyWebApi.prototype, "addToQueue").mockResolvedValue({body: {}} as never)

    const requests = [
        bot.tryToAddSongToQueue("spotify:track:123", "100"),
        bot.tryToAddSongToQueue("spotify:track:123", "100")
    ]
    await started
    expect(getTrack).not.toHaveBeenCalled()
    completeRefresh({body: {access_token: "new-access", expires_in: 3600}} as never)
    expect((await Promise.all(requests)).every((result) => result.success)).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(state.reads()).toBe(1)
})

test("startup does not count an account with a failed refresh as an active instance", async () => {
    const state = setup()
    state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockRejectedValue({statusCode: 401})

    await bot.init()
    await bot.start()

    expect(bot.instanceCount).toBe(0)
    expect(bot.hasGuildInstance("100")).toBe(false)
})

for (const outcome of ["success", "failure"] as const) {
    test(`an old ${outcome} refresh cannot overwrite or remove a reauthorized connection`, async () => {
        const state = setup()
        state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
        const pending = deferred<never>()
        const started = deferred<void>()
        const writes: string[] = []
        state.repo.updateTokens = async (_guildId, data) => {
            writes.push(data.accessToken)
            return config
        }
        refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
            started.resolve()
            return pending.promise
        })
        const timers = spyOn(globalThis, "setTimeout")
        try {
            await bot.init()
            const startup = bot.start()
            await started.promise
            await bot.saveConnection("100", newConnection)
            const timerCount = timers.mock.calls.length
            if (outcome === "success")
                pending.resolve({body: {access_token: "obsolete-access", expires_in: 3600}} as never)
            else pending.reject({statusCode: 401, message: "secret-refresh"})
            await startup
            expect(bot.hasGuildInstance("100")).toBe(true)
            expect(writes).toEqual([])
            expect(timers.mock.calls.length).toBe(timerCount)
            let accessToken: string | undefined
            playback = spyOn(SpotifyWebApi.prototype, "getMyCurrentPlaybackState").mockImplementation(function (
                this: SpotifyWebApi
            ) {
                accessToken = this.getAccessToken()
                return Promise.resolve({body: {item: track}} as never)
            })
            await bot.getCurrentlyPlaying("100")
            expect(accessToken).toBe("reauth-access")
            expect((await state.repo.findByGuildId("100"))?.accessToken).toBe("reauth-access")
        } finally {
            timers.mockRestore()
        }
    })
}

test("reauthorization waits for an in-flight refresh database write and persists the new credentials last", async () => {
    const state = setup()
    state.save()
    const writeStarted = deferred<void>()
    const finishWrite = deferred<void>()
    const events: string[] = []
    state.repo.updateTokens = async (_guildId, data) => {
        writeStarted.resolve()
        await finishWrite.promise
        state.save({...config, accessToken: data.accessToken})
        events.push("refresh")
        return config
    }
    const save = state.repo.save.bind(state.repo)
    state.repo.save = async (guildId, data) => {
        events.push("reauth")
        return save(guildId, data)
    }
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockResolvedValue({
        body: {access_token: "old-refreshed", expires_in: 3600}
    } as never)
    await bot.init()
    const startup = bot.start()
    await writeStarted.promise
    const authorization = bot.saveConnection("100", newConnection)
    await Promise.resolve()
    expect(events).toEqual([])
    finishWrite.resolve()
    await Promise.all([startup, authorization])
    expect(events).toEqual(["refresh", "reauth"])
    expect((await state.repo.findByGuildId("100"))?.accessToken).toBe("reauth-access")
    expect(bot.hasGuildInstance("100")).toBe(true)
    let accessToken: string | undefined
    playback = spyOn(SpotifyWebApi.prototype, "getMyCurrentPlaybackState").mockImplementation(function (
        this: SpotifyWebApi
    ) {
        accessToken = this.getAccessToken()
        return Promise.resolve({body: {item: track}} as never)
    })
    await bot.getCurrentlyPlaying("100")
    expect(accessToken).toBe("reauth-access")
})

for (const action of ["remove", "shutdown"] as const) {
    for (const outcome of ["success", "failure"] as const) {
        test(`${action} prevents a pending ${outcome} refresh from persisting tokens or scheduling another timer`, async () => {
            const state = setup()
            state.save()
            const pending = deferred<never>()
            const started = deferred<void>()
            const writes: string[] = []
            state.repo.updateTokens = async (_guildId, data) => {
                writes.push(data.accessToken)
                return config
            }
            refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
                started.resolve()
                return pending.promise
            })
            const timers = spyOn(globalThis, "setTimeout")
            try {
                await bot.init()
                const startup = bot.start()
                await started.promise
                if (action === "remove") bot.removeGuildInstance("100")
                else await bot.onModuleDestroy()
                const timerCount = timers.mock.calls.length
                if (outcome === "success")
                    pending.resolve({body: {access_token: "obsolete-access", expires_in: 3600}} as never)
                else pending.reject({statusCode: 503})
                await startup
                expect(writes).toEqual([])
                expect(timers.mock.calls.length).toBe(timerCount)
                expect(bot.instanceCount).toBe(0)
            } finally {
                timers.mockRestore()
            }
        })
    }
}

test("redemption handler restores saved configuration after a failed startup refresh", async () => {
    const state = setup()
    state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockRejectedValue({statusCode: 503})
    await bot.init()
    await bot.start()
    expect(bot.hasGuildInstance("100")).toBe(false)
    refresh.mockResolvedValue({body: {access_token: "recovered-access", expires_in: 3600}} as never)
    getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockResolvedValue({body: track} as never)
    enqueue = spyOn(SpotifyWebApi.prototype, "addToQueue").mockResolvedValue({body: {}} as never)
    const requests = new SongRequestService(
        {
            findByChannelId: async () => ({
                guildId: "100",
                channelId: "channel",
                enabled: true,
                chatCommandEnabled: false
            })
        } as unknown as SongRequestRepository,
        {findByGuildId: async () => ({userId: "channel"})} as unknown as TwitchAuthRepository,
        bot,
        logger,
        {} as never
    )
    const handler = new SpotifySongRequestHandler(requests)
    const ctx = {
        guildId: "100",
        broadcasterUserId: "channel",
        rewardId: "reward",
        rewardTitle: "Song",
        input: "spotify:track:123",
        userName: "Listener"
    }
    expect(await requests.request("channel", ctx.input)).toMatchObject({
        success: false,
        chatReply: "The !sr chat command is currently disabled."
    })
    expect(enqueue).not.toHaveBeenCalled()
    expect((await handler.handle(ctx)).chatReply).toContain('Your song "Test song"')
    expect(bot.hasGuildInstance("100")).toBe(true)
    expect(await handler.handle({...ctx, guildId: "200"})).toMatchObject({
        refund: true,
        chatReply: "Listener, Another server handles song requests for this channel."
    })
    expect(enqueue).toHaveBeenCalledTimes(1)
})

test("concurrent unauthorized playback calls share refresh and log safe guild context on failure", async () => {
    setup()
    const pending = deferred<never>()
    const started = deferred<void>()
    const errors: string[] = []
    const moduleLogger = {
        info: () => {},
        warn: () => {},
        error: (message: string) => errors.push(message),
        debug: () => {}
    } as ModuleLogger
    let persists = 0
    const instance = new GuildSpotifyInstance(
        {clientId: "id", clientSecret: "secret", accessToken: "access", refreshToken: "refresh", expiresIn: 3600},
        moduleLogger,
        async () => {
            persists++
        },
        "100"
    )
    playback = spyOn(SpotifyWebApi.prototype, "getMyCurrentPlaybackState").mockRejectedValue({
        statusCode: 401,
        message: "secret-access"
    })
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
        started.resolve()
        return pending.promise
    })
    try {
        const requests = [instance.getCurrentlyPlaying(), instance.getCurrentlyPlaying()]
        await started.promise
        pending.reject(new Error("secret-refresh"))
        expect(await Promise.all(requests)).toEqual([null, null])
        expect(refresh).toHaveBeenCalledTimes(1)
        expect(persists).toBe(0)
        expect(errors.length).toBe(3)
        expect(errors.every((message) => message.includes("guild=100") && message.includes("status="))).toBe(true)
        expect(errors.join(" ")).not.toContain("secret-access")
        expect(errors.join(" ")).not.toContain("secret-refresh")
    } finally {
        instance.dispose()
    }
})

for (const outcome of ["success", "failure"] as const) {
    test(`restoration returns the new connection after its old ${outcome} refresh completes`, async () => {
        const state = setup()
        state.save({...config, expiresAt: new Date(Date.now() - 60_000)})
        const pending = deferred<never>()
        const started = deferred<void>()
        refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
            started.resolve()
            return pending.promise
        })
        let queuedAccessToken: string | undefined
        getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockImplementation(function (this: SpotifyWebApi) {
            queuedAccessToken = this.getAccessToken()
            return Promise.resolve({body: track} as never)
        })
        enqueue = spyOn(SpotifyWebApi.prototype, "addToQueue").mockResolvedValue({body: {}} as never)
        const request = bot.tryToAddSongToQueue("spotify:track:123", "100")
        await started.promise
        await bot.saveConnection("100", newConnection)
        if (outcome === "success") pending.resolve({body: {access_token: "obsolete-access", expires_in: 3600}} as never)
        else pending.reject({statusCode: 401})
        expect((await request).success).toBe(true)
        expect(queuedAccessToken).toBe("reauth-access")
        expect(bot.instanceCount).toBe(1)
    })
}

test("a refresh queued behind authorization checks instance identity before writing tokens", async () => {
    const state = setup()
    state.save()
    const pendingRefresh = deferred<never>()
    const refreshStarted = deferred<void>()
    const authStarted = deferred<void>()
    const finishAuth = deferred<void>()
    const writes: string[] = []
    const save = state.repo.save.bind(state.repo)
    state.repo.save = async (guildId, data) => {
        authStarted.resolve()
        await finishAuth.promise
        return save(guildId, data)
    }
    state.repo.updateTokens = async (_guildId, data) => {
        writes.push(data.accessToken)
        return config
    }
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockImplementation(() => {
        refreshStarted.resolve()
        return pendingRefresh.promise
    })
    await bot.init()
    const startup = bot.start()
    await refreshStarted.promise
    const auth = bot.saveConnection("100", newConnection)
    await authStarted.promise
    pendingRefresh.resolve({body: {access_token: "obsolete-access", expires_in: 3600}} as never)
    await Promise.resolve()
    await Promise.resolve()
    finishAuth.resolve()
    await Promise.all([startup, auth])
    expect(writes).toEqual([])
    expect((await state.repo.findByGuildId("100"))?.accessToken).toBe("reauth-access")
    expect(bot.instanceCount).toBe(1)
})

test("disposing while refresh persistence is pending prevents token application and timers", async () => {
    setup()
    const pendingPersistence = deferred<void>()
    const persistenceStarted = deferred<void>()
    const instance = new GuildSpotifyInstance(
        {
            clientId: "id",
            clientSecret: "secret",
            accessToken: "original-access",
            refreshToken: "refresh",
            expiresIn: 3600
        },
        logger.forModule("Spotify"),
        async () => {
            persistenceStarted.resolve()
            await pendingPersistence.promise
        },
        "100"
    )
    refresh = spyOn(SpotifyWebApi.prototype, "refreshAccessToken").mockResolvedValue({
        body: {access_token: "obsolete-access", expires_in: 3600}
    } as never)
    const timers = spyOn(globalThis, "setTimeout")
    try {
        const refreshResult = instance.start()
        await persistenceStarted.promise
        instance.dispose()
        pendingPersistence.resolve()
        expect(await refreshResult).toBe(false)
        expect(timers).not.toHaveBeenCalled()
        let accessToken: string | undefined
        playback = spyOn(SpotifyWebApi.prototype, "getMyCurrentPlaybackState").mockImplementation(function (
            this: SpotifyWebApi
        ) {
            accessToken = this.getAccessToken()
            return Promise.resolve({body: {item: track}} as never)
        })
        await instance.getCurrentlyPlaying()
        expect(accessToken).toBe("original-access")
    } finally {
        timers.mockRestore()
        instance.dispose()
    }
})

for (const action of ["remove", "shutdown"] as const) {
    test(`${action} while saved configuration lookup is pending prevents restoration`, async () => {
        const state = setup()
        const lookup = deferred<SpotifyConfigRecord>()
        state.repo.findByGuildId = () => lookup.promise
        getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockResolvedValue({body: track} as never)
        const request = bot.tryToAddSongToQueue("spotify:track:123", "100")
        if (action === "remove") bot.removeGuildInstance("100")
        else await bot.onModuleDestroy()
        lookup.resolve(config)
        expect(await request).toEqual({success: false})
        expect(getTrack).not.toHaveBeenCalled()
        expect(bot.instanceCount).toBe(0)
    })
}

test("queue failures log guild and safe status and expose a useful English error", async () => {
    setup()
    const errors: string[] = []
    const instance = new GuildSpotifyInstance(
        {clientId: "id", clientSecret: "secret", accessToken: "access", refreshToken: "refresh", expiresIn: 3600},
        {
            info: () => {},
            warn: () => {},
            debug: () => {},
            error: (message: string) => errors.push(message)
        } as ModuleLogger,
        async () => {},
        "100"
    )
    getTrack = spyOn(SpotifyWebApi.prototype, "getTrack").mockRejectedValue({
        statusCode: 403,
        message: "secret-provider-response"
    })
    const search = spyOn(SpotifyWebApi.prototype, "search").mockRejectedValue({
        statusCode: 503,
        message: "secret-search-response"
    })
    try {
        await expect(instance.tryToAddSongToQueue("spotify:track:123")).rejects.toThrow(
            "Spotify could not add the song to the queue. Please try again or check that Spotify is playing."
        )
        expect(search).not.toHaveBeenCalled()
        await expect(instance.tryToAddSongToQueue("An ordinary song title")).rejects.toThrow(
            "Spotify could not add the song to the queue"
        )
        expect(errors).toEqual([
            "Failed to queue Spotify song guild=100 status=403 error_type=unknown",
            "Failed to queue Spotify song guild=100 status=503 error_type=unknown"
        ])
        expect(errors.join(" ")).not.toContain("secret")
    } finally {
        search.mockRestore()
        instance.dispose()
    }
})
