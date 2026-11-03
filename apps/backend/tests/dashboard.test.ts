import {AuthController} from "../src/api/auth/controllers/auth.controller"
import "reflect-metadata"
import {afterAll, beforeAll, beforeEach, describe, expect, spyOn, test} from "bun:test"
import {Module, type INestApplication} from "@nestjs/common"
import {NestFactory} from "@nestjs/core"
import {Client} from "discord.js"
import type {Request} from "express"
import type {TwitchConfigRecord, TwitchConfigRepository, WebSessionRecord, WebSessionRepository} from "@streamcat/db"
import {BotLoggerService} from "@streamcat/core"
import {GuildsController} from "../src/api/guilds/controllers/guilds.controller"
import {GuildsService} from "../src/api/guilds/services/guilds.service"
import {GuildAccessService} from "../src/integrations/discord/guild-access.service"
import {DiscordLoginService} from "../src/api/auth/discord-login.service"
import {SongRequestsController} from "../src/api/guilds/controllers/song-requests.controller"
import {SongRequestService} from "../src/features/song-requests/song-request.service"
import {SpotifyService} from "../src/integrations/spotify/spotify.service"
import {TwitchStreamersController} from "../src/api/guilds/controllers/twitch-streamers.controller"
import {StreamerFollowService} from "../src/features/stream-notifications/streamer-follow.service"
import {TwitchService} from "../src/integrations/twitch/services/twitch.service"
import type {TwitchAuthProvider} from "../src/integrations/twitch/auth/twitch-auth-provider"
import type {TwitchEventSubManager} from "../src/integrations/twitch/eventsub/twitch-event-sub-manager"
import {
    cookieValue,
    createLoginState,
    isGuildAdmin,
    SESSION_COOKIE,
    sessionHash,
    STATE_SECONDS,
    validLoginState
} from "../src/api/auth/auth-security"

const secret = "test-secret-only-not-used-outside-this-test"
const token = "a".repeat(64)
const records = new Map<string, WebSessionRecord>()
const repository = {
    async findById(id: string) {
        return records.get(id) ? {...records.get(id)!} : null
    },
    async create(session: WebSessionRecord) {
        records.set(session.id, {...session})
    },
    async delete(id: string) {
        records.delete(id)
    },
    async updateTokens(id: string, accessToken: string, refreshToken: string, tokenExpiresAt: Date) {
        const session = records.get(id)
        if (!session) throw new Error("Session removed")
        Object.assign(session, {accessToken, refreshToken, tokenExpiresAt})
    }
} as unknown as WebSessionRepository
const client = {
    isReady: () => true,
    guilds: {
        cache: new Map([
            [
                "100",
                {
                    id: "100",
                    name: "Owner",
                    icon: null,
                    get ownerId() {
                        return guilds[0].owner ? "99" : "other"
                    },
                    memberCount: 42,
                    members: {fetch: async () => ({permissions: {has: () => false, bitfield: 0n}})}
                }
            ],
            [
                "300",
                {
                    id: "300",
                    name: "Member server",
                    icon: null,
                    ownerId: "other",
                    memberCount: 12,
                    members: {
                        fetch: async () => ({
                            permissions: {
                                has: () => guilds[2].permissions === "8",
                                bitfield: BigInt(guilds[2].permissions)
                            }
                        })
                    }
                }
            ]
        ])
    }
} as unknown as Client
const logEntries: string[] = []
const logger = {
    forModule: () => ({
        info: (message: string) => logEntries.push(message),
        warn: (message: string) => logEntries.push(message),
        error: (message: string) => logEntries.push(message)
    })
} as unknown as BotLoggerService
const login = new DiscordLoginService(repository, logger)
const dashboard = new GuildsService(client, login, logger)
const followedStreams: TwitchConfigRecord[] = []
const subscriptions: string[] = []
const unsubscribedChannels: string[] = []
const queueGuilds: string[] = []
const profileRequests: string[][] = []
const twitchUsers = [
    {id: "10", name: "studio", displayName: "Studio", profilePictureUrl: "https://example.com/studio.png"},
    {id: "20", name: "guest", displayName: "Guest", profilePictureUrl: "https://example.com/guest.png"}
]
let twitchUnavailable = false
const twitch = new TwitchService(
    {
        getClient: () => {
            if (twitchUnavailable) throw new Error("Twitch unavailable")
            return {
                users: {
                    getUserByName: async (name: string) => twitchUsers.find((user) => user.name === name) ?? null,
                    getUsersByIds: async (ids: string[]) => {
                        profileRequests.push(ids)
                        return twitchUsers.filter((user) => ids.includes(user.id))
                    }
                }
            }
        }
    } as unknown as TwitchAuthProvider,
    logger
)
const follows = new StreamerFollowService(
    {
        findByGuildId: async (guildId: string) => followedStreams.filter((follow) => follow.guildId === guildId),
        findByGuildIdAndUsername: async (guildId: string, username: string) =>
            followedStreams.find((follow) => follow.guildId === guildId && follow.username.toLowerCase() === username),
        delete: async (guildId: string, username: string) => {
            const index = followedStreams.findIndex(
                (follow) => follow.guildId === guildId && follow.username === username
            )
            if (index < 0) throw new Error("Missing follow")
            followedStreams.splice(index, 1)
        },
        createIfMissing: async (follow: {guildId: string; username: string; channelId: string}) => {
            if (
                !followedStreams.some((saved) => saved.guildId === follow.guildId && saved.username === follow.username)
            ) {
                followedStreams.push({...follow, id: followedStreams.length + 1, mainStream: false})
            }
        }
    } as unknown as TwitchConfigRepository,
    twitch,
    {
        unsubscribeFromStreamer: async (channelId: string) => {
            unsubscribedChannels.push(channelId)
        },
        subscribeToStreamer: async (name: string) => {
            subscriptions.push(name)
        }
    } as unknown as TwitchEventSubManager,
    logger
)

@Module({
    controllers: [AuthController, GuildsController, TwitchStreamersController, SongRequestsController],
    providers: [
        {provide: Client, useValue: client},
        {provide: GuildAccessService, useValue: new GuildAccessService(client, logger)},
        {provide: BotLoggerService, useValue: logger},
        {provide: DiscordLoginService, useValue: login},
        {provide: GuildsService, useValue: dashboard},
        {provide: StreamerFollowService, useValue: follows},
        {provide: SongRequestService, useValue: {}},
        {
            provide: SpotifyService,
            useValue: {
                getQueue: async (guildId: string) => {
                    queueGuilds.push(guildId)
                    return {
                        connected: true,
                        tracks: [
                            {
                                uri: "spotify:track:1",
                                name: "In the End",
                                artists: ["Linkin Park"],
                                coverUrl: "https://example.com/cover.jpg"
                            }
                        ]
                    }
                }
            }
        }
    ]
})
class TestModule {}

let app: INestApplication
let origin: string
const nativeFetch = globalThis.fetch
let mockFetch: ReturnType<typeof spyOn>
let refreshes = 0
let discordDenied = false
let guilds = [
    {id: "100", name: "Owner", owner: true, permissions: "0", icon: null},
    {id: "200", name: "Admin", owner: false, permissions: "8", icon: null},
    {id: "300", name: "Manage Guild only", owner: false, permissions: "32", icon: null}
]

beforeAll(async () => {
    app = await NestFactory.create(TestModule, {logger: false})
    await app.listen(0, "127.0.0.1")
    origin = await app.getUrl()
})

beforeEach(() => {
    logEntries.length = 0
    followedStreams.length = 0
    subscriptions.length = 0
    unsubscribedChannels.length = 0
    queueGuilds.length = 0
    profileRequests.length = 0
    twitchUnavailable = false
    mockFetch?.mockRestore()
    process.env.AUTH_SECRET = secret
    process.env.AUTH_DISCORD_ID = "123456789"
    process.env.AUTH_DISCORD_SECRET = "test-client-secret"
    process.env.PUBLIC_URL = "http://127.0.0.1:3000"
    refreshes = 0
    discordDenied = false
    guilds = [
        {id: "100", name: "Owner", owner: true, permissions: "0", icon: null},
        {id: "200", name: "Admin", owner: false, permissions: "8", icon: null},
        {id: "300", name: "Manage Guild only", owner: false, permissions: "32", icon: null}
    ]
    records.clear()
    records.set(sessionHash(token), {
        id: sessionHash(token),
        userId: "99",
        name: "Test user",
        avatar: null,
        accessToken: "private-access",
        refreshToken: "private-refresh",
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        expiresAt: new Date(Date.now() + 86400_000)
    })
    mockFetch = spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input)
        if (!url.startsWith("https://discord.com/")) return nativeFetch(input, init)
        if (url.includes("oauth2/token")) {
            if (String(init?.body).includes("refresh_token")) refreshes++
            if (discordDenied) return Response.json({error: "invalid_grant"}, {status: 400})
            return Response.json({
                access_token: "new-private-access",
                refresh_token: "new-private-refresh",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "identify guilds"
            })
        }
        if (discordDenied) return Response.json({}, {status: 401})
        if (url.includes("/guilds")) return Response.json(guilds)
        return Response.json({id: "99", username: "Tester", global_name: "Test user", avatar: null})
    })
})

afterAll(async () => {
    mockFetch?.mockRestore()
    await app.close()
})

function api(path: string, session = token, init: RequestInit = {}) {
    return nativeFetch(`${origin}/dashboard/${path}`, {
        ...init,
        headers: {Cookie: `${SESSION_COOKIE}=${session}`, ...init.headers},
        redirect: "manual"
    })
}

describe("dashboard Twitch streamers", () => {
    const path = "guilds/100/twitch/streamers"
    const post = (body: unknown, origin = "http://127.0.0.1:3000") => ({
        method: "POST",
        headers: {Origin: origin, "Content-Type": "application/json"},
        body: JSON.stringify(body)
    })

    test("lists only this guild's follows with current profiles, including the main and deleted channels", async () => {
        followedStreams.push(
            {id: 1, guildId: "100", channelId: "10", username: "oldstudio", mainStream: true},
            {id: 2, guildId: "100", channelId: "missing", username: "deleted", mainStream: false},
            {id: 3, guildId: "300", channelId: "20", username: "guest", mainStream: false}
        )
        const response = await api(path)
        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toContain("no-store")
        expect(await response.json()).toEqual([
            {
                channelId: "10",
                username: "studio",
                displayName: "Studio",
                profilePictureUrl: "https://example.com/studio.png",
                mainStream: true
            },
            {
                channelId: "missing",
                username: "deleted",
                displayName: "deleted",
                profilePictureUrl: null,
                mainStream: false
            }
        ])
        expect(profileRequests).toEqual([["10", "missing"]])
    })

    test("adds a streamer through the existing notification flow and does not duplicate repeated requests", async () => {
        const response = await api(path, token, post({username: " Guest "}))
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
            channelId: "20",
            username: "guest",
            displayName: "Guest",
            profilePictureUrl: "https://example.com/guest.png",
            mainStream: false
        })
        expect((await api(path, token, post({username: "GUEST"}))).status).toBe(200)
        expect(followedStreams).toHaveLength(1)
        expect(subscriptions).toEqual(["guest"])
        expect(await (await api(path)).json()).toHaveLength(1)
    })

    test("rejects unauthenticated, foreign, cross-site and invalid additions before changing follows", async () => {
        expect((await api(path, "")).status).toBe(401)
        expect((await api(path, "", post({username: "guest"}))).status).toBe(401)
        expect((await api("guilds/300/twitch/streamers")).status).toBe(403)
        expect((await api("guilds/300/twitch/streamers", token, post({username: "guest"}))).status).toBe(403)
        expect((await api(path, token, post({username: "guest"}, "https://attacker.example"))).status).toBe(403)
        for (const body of [
            null,
            [],
            {},
            {username: 1},
            {username: ""},
            {username: "https://twitch.tv/guest"},
            {username: "guest", guildId: "300"}
        ]) {
            expect((await api(path, token, post(body))).status).toBe(400)
        }
        expect(followedStreams).toHaveLength(0)
        expect(subscriptions).toHaveLength(0)
    })

    test("removes by stable channel ID without Twitch and protects own, foreign and cross-site follows", async () => {
        followedStreams.push(
            {id: 1, guildId: "100", channelId: "10", username: "oldstudio", mainStream: true},
            {id: 2, guildId: "100", channelId: "20", username: "OldGuest", mainStream: false},
            {id: 3, guildId: "300", channelId: "30", username: "foreign", mainStream: false}
        )
        const remove = {method: "DELETE", headers: {Origin: "http://127.0.0.1:3000"}}
        expect((await api(`${path}/20`, "", remove)).status).toBe(401)
        expect((await api("guilds/300/twitch/streamers/30", token, remove)).status).toBe(403)
        expect(
            (await api(`${path}/20`, token, {method: "DELETE", headers: {Origin: "https://attacker.example"}})).status
        ).toBe(403)
        expect((await api(`${path}/10`, token, remove)).status).toBe(400)
        expect((await api(`${path}/30`, token, remove)).status).toBe(404)
        twitchUnavailable = true
        const response = await api(`${path}/20`, token, remove)
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({channelId: "20"})
        expect(followedStreams.map((follow) => follow.channelId)).toEqual(["10", "30"])
        expect(unsubscribedChannels).toEqual(["20"])
    })

    test("returns the authorized guild's queue and rejects unauthenticated and foreign reads", async () => {
        expect((await api("guilds/100/song-requests/queue", "")).status).toBe(401)
        expect((await api("guilds/300/song-requests/queue")).status).toBe(403)
        const response = await api("guilds/100/song-requests/queue")
        expect(response.status).toBe(200)
        expect(response.headers.get("cache-control")).toContain("no-store")
        expect((await response.json()).tracks[0]).toEqual({
            uri: "spotify:track:1",
            name: "In the End",
            artists: ["Linkin Park"],
            coverUrl: "https://example.com/cover.jpg"
        })
        expect(queueGuilds).toEqual(["100"])
    })

    test("reports missing users and provider outages, and protects the main streamer after a rename", async () => {
        expect((await api(path, token, post({username: "unknown"}))).status).toBe(404)
        followedStreams.push({id: 1, guildId: "100", channelId: "10", username: "oldstudio", mainStream: true})
        expect((await api(path, token, post({username: "studio"}))).status).toBe(400)
        twitchUnavailable = true
        const listResponse = await api(path)
        const followResponse = await api(path, token, post({username: "guest"}))
        for (const response of [listResponse, followResponse]) {
            expect(response.status).toBe(503)
            expect((await response.json()).message).toBe("Twitch is currently unavailable. Please try again.")
        }
        expect(followedStreams).toHaveLength(1)
        expect(subscriptions).toHaveLength(0)
    })
})

describe("OAuth state and guild permissions", () => {
    test("rejects tampered, expired, mismatched and unbound OAuth states", () => {
        const now = 100_000
        const state = createLoginState(secret, now)
        expect(validLoginState(state.state, state.cookie, secret, now)).toBe(true)
        expect(validLoginState(state.state, null, secret, now)).toBe(false)
        expect(validLoginState("attacker", state.cookie, secret, now)).toBe(false)
        expect(validLoginState(state.state, state.cookie + "0", secret, now)).toBe(false)
        expect(validLoginState(state.state, state.cookie, "wrong-secret", now)).toBe(false)
        expect(validLoginState(state.state, state.cookie, secret, now + STATE_SECONDS * 1000)).toBe(false)
        expect(cookieValue("unrelated=1; streamcat_session=%invalid", SESSION_COOKIE)).toBeNull()
    })

    test("requires owner/admin, rejects ManageGuild and malformed permissions", () => {
        expect(isGuildAdmin({owner: true, permissions: "0"})).toBe(true)
        expect(isGuildAdmin({permissions: ((1n << 60n) | 8n).toString()})).toBe(true)
        expect(isGuildAdmin({permissions: "32"})).toBe(false)
        expect(isGuildAdmin({permissions: "-1"})).toBe(false)
        expect(isGuildAdmin({permissions: "invalid"})).toBe(false)
    })
})

describe("dashboard HTTP access", () => {
    test("reuses an existing session after restart instead of starting Discord OAuth again", async () => {
        const restartedLogin = new DiscordLoginService(repository, logger)
        const session = await restartedLogin.session({headers: {cookie: `${SESSION_COOKIE}=${token}`}} as Request)
        expect(session.userId).toBe("99")
        const response = await api("auth/login")
        expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/dashboard")
        expect(records.size).toBe(1)
        expect(logEntries.join("\n")).toContain("Existing Discord session resumed")
        expect(logEntries.join("\n")).not.toContain("Discord login started")
        records.get(sessionHash(token))!.expiresAt = new Date(0)
        const expired = await api("auth/login")
        expect(new URL(expired.headers.get("location")!).origin).toBe("https://discord.com")
        expect(records.size).toBe(0)
    })

    test("reports missing OAuth configuration before redirecting to Discord", async () => {
        delete process.env.AUTH_DISCORD_SECRET
        const response = await api("auth/login", "")
        expect(response.status).toBe(503)
        expect(logEntries.join("\n")).toContain("configuration missing: AUTH_DISCORD_SECRET")
    })

    test("logs token exchange failures without credentials or authorization codes", async () => {
        discordDenied = true
        await expect(login.completeLogin("sensitive-authorization-code", null)).rejects.toThrow()
        const logs = logEntries.join("\n")
        expect(logs).toContain("http_status=400 reason=invalid_grant")
        expect(logs).toContain("stage=token_exchange status=401")
        expect(logs).not.toContain("sensitive-authorization-code")
        expect(logs).not.toContain("test-client-secret")
    })

    test("identifies persistence failures without logging raw database errors", async () => {
        const create = spyOn(repository, "create").mockRejectedValue(
            Object.assign(new Error("private-access sensitive-database-details"), {code: "P2021"})
        )
        try {
            await expect(login.completeLogin("sensitive-authorization-code", null)).rejects.toThrow()
            const logs = logEntries.join("\n")
            expect(logs).toContain("stage=session_create status=internal")
            expect(logs).toContain("error_code=P2021")
            expect(logs).not.toContain("private-access")
            expect(logs).not.toContain("sensitive-database-details")
        } finally {
            create.mockRestore()
        }
    })

    test("rejects anonymous direct API calls and expired sessions", async () => {
        expect((await api("guilds", "")).status).toBe(401)
        expect((await api("guilds/100", "")).status).toBe(401)
        records.get(sessionHash(token))!.expiresAt = new Date(0)
        expect((await api("me")).status).toBe(401)
        expect(records.size).toBe(0)
    })

    test("only lists owned/admin guilds and generates scoped bot invitations", async () => {
        const response = await api("guilds")
        expect(response.status).toBe(200)
        const result = await response.json()
        expect(result.map((guild: {id: string}) => guild.id)).toEqual(["100", "200"])
        expect(result.map((guild: {botPresent: boolean}) => guild.botPresent)).toEqual([true, false])
        const invite = new URL(result[1].inviteUrl)
        expect(invite.searchParams.get("guild_id")).toBe("200")
        expect(invite.searchParams.get("scope")).toBe("bot applications.commands")
        expect(BigInt(invite.searchParams.get("permissions")!) & 8n).toBe(0n)
        expect(response.headers.get("cache-control")).toContain("no-store")
        expect(JSON.stringify(result)).not.toContain("private-access")
    })

    test("blocks direct foreign/ManageGuild access; returns member count only for authorized installed guilds", async () => {
        expect((await api("guilds/300")).status).toBe(403)
        expect((await api("guilds/999")).status).toBe(403)
        expect((await api("guilds/200")).status).toBe(404)
        const response = await api("guilds/100")
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({id: "100", memberCount: 42, botReady: true})
        guilds[0].owner = false
        expect((await api("guilds/100")).status).toBe(403)
    })

    test("checks current administrator permissions through the bot", async () => {
        guilds[2].permissions = "8"
        expect((await api("guilds/300")).status).toBe(200)
        guilds[2].permissions = "32"
        expect((await api("guilds/300")).status).toBe(403)
    })

    test("installed guild details work even when Discord OAuth guild requests fail", async () => {
        discordDenied = true
        expect((await api("guilds/100")).status).toBe(200)
        expect(records.size).toBe(1)
    })

    test("refreshes expiring Discord tokens once for concurrent requests and persists rotation", async () => {
        records.get(sessionHash(token))!.tokenExpiresAt = new Date(0)
        const responses = await Promise.all([api("guilds"), api("guilds/100")])
        expect(responses.map((response) => response.status)).toEqual([200, 200])
        expect(refreshes).toBe(1)
        expect(records.get(sessionHash(token))!.refreshToken).toBe("new-private-refresh")
    })

    test("revokes invalid Discord sessions and never exposes tokens in /me", async () => {
        const me = await api("me")
        expect(await me.json()).toEqual({id: "99", name: "Test user", avatar: null})
        discordDenied = true
        expect((await api("guilds")).status).toBe(401)
        expect(records.size).toBe(0)
    })

    test("protects logout against cross-site requests and revokes the session", async () => {
        expect(
            (await api("auth/logout", token, {method: "POST", headers: {Origin: "https://attacker.example"}})).status
        ).toBe(403)
        expect(records.size).toBe(1)
        const response = await api("auth/logout", token, {method: "POST", headers: {Origin: "http://127.0.0.1:3000"}})
        expect(response.status).toBe(303)
        expect(records.size).toBe(0)
        expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    })

    test("normalizes the public hostname for Discord OAuth redirects", () => {
        process.env.PUBLIC_URL = "https://streamcat.domain.de"
        const authorize = new URL(login.loginUrl("test-state"))
        expect(authorize.searchParams.get("redirect_uri")).toBe("https://streamcat.domain.de/callback/discord")
        expect(login.callbackUrl()).toBe("https://streamcat.domain.de/callback/discord")
    })

    test("validates browser-bound state before code exchange, creates opaque HttpOnly session", async () => {
        const rejected = await nativeFetch(`${origin}/callback/discord?code=anything&state=attacker`, {
            redirect: "manual"
        })
        expect(rejected.status).toBe(302)
        expect(logEntries.join("\n")).toContain("reason=missing_state_cookie")
        expect(rejected.headers.get("location")).toContain("login=invalid")
        expect(records.size).toBe(1)
        const redirect = await api("auth/login", "")
        const authorize = new URL(redirect.headers.get("location")!)
        expect(authorize.searchParams.get("scope")).toBe("identify guilds")
        expect(authorize.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3000/callback/discord")
        const cookie = redirect.headers.get("set-cookie")!.split(";")[0]
        const response = await nativeFetch(
            `${origin}/callback/discord?code=valid&state=${authorize.searchParams.get("state")}`,
            {
                headers: {Cookie: cookie},
                redirect: "manual"
            }
        )
        expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/dashboard")
        expect(response.headers.get("cache-control")).toContain("no-store")
        const cookies = response.headers.getSetCookie().join(";")
        expect(cookies).toContain("HttpOnly")
        expect(cookies).toContain("SameSite=Lax")
        expect(cookies).toContain("Max-Age=604800")
        expect(cookies).toContain("Expires=")
        expect(cookies).not.toContain("private-access")
        expect(records.size).toBe(2)
        expect(logEntries.join("\n")).toContain("Discord login completed; session created")
    })
})
