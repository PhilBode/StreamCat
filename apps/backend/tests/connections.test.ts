import "reflect-metadata"
import {afterAll, beforeAll, beforeEach, expect, test} from "bun:test"
import {Module, type INestApplication} from "@nestjs/common"
import {NestFactory} from "@nestjs/core"
import {Client} from "discord.js"
import {BotLoggerService} from "@streamcat/core"
import {GuildAccessService} from "../src/integrations/discord/guild-access.service"
import type {Request} from "express"
import {SpotifyConfigRepository, TwitchAuthRepository} from "@streamcat/db"
import {GuildConnectionsController} from "../src/api/guilds/controllers/guild-connections.controller"
import {DiscordLoginService} from "../src/api/auth/discord-login.service"
import {OAuthFlowService, type AuthFlowOptions} from "../src/features/account-linking/services/oauth-flow.service"
import {SpotifyConnectionService} from "../src/features/account-linking/providers/spotify-connection.service"
import {TwitchConnectionService} from "../src/features/account-linking/providers/twitch-connection.service"
import {SpotifyService} from "../src/integrations/spotify/spotify.service"

const session = {id: "session-a", userId: "99"}
let captured: AuthFlowOptions | undefined
let hasProfilePicture = true
let app: INestApplication
let origin: string
const login = {
    session: async (req: Request) => (req.headers.cookie === "session-b" ? {...session, id: "session-b"} : session),
    guilds: async () => []
}
const client = {
    isReady: () => true,
    guilds: {
        cache: new Map([
            [
                "100",
                {
                    id: "100",
                    name: "Test guild",
                    icon: null,
                    ownerId: "99",
                    memberCount: 4,
                    members: {fetch: async () => ({permissions: {has: () => false, bitfield: 0n}})}
                }
            ]
        ])
    }
} as unknown as Client
const logger = {forModule: () => ({warn: () => {}, error: () => {}})} as unknown as BotLoggerService

const provider = {
    getAuthUrl: () => "",
    exchangeCode: async () => ({accessToken: "token", refreshToken: "refresh", expiresIn: 3600, scope: ""}),
    fetchUserInfo: async () => ({userId: "provider", username: "Streamer"})
}
const flow = {
    begin: async (options: AuthFlowOptions) => {
        captured = options
        return {url: "https://provider.example/authorize", result: Promise.resolve()}
    }
}
const spotify = {
    getProfilePictureUrl: async () => (hasProfilePicture ? "https://i.scdn.co/image/spotify-profile" : null),
    createAuthorizationOptions: async (guildId: string) => ({
        guildId,
        label: "Spotify",
        provider,
        complete: async () => {}
    })
}
const twitch = {
    getProfilePictureUrl: async () => (hasProfilePicture ? "https://static-cdn.jtvnw.net/twitch-profile.png" : null),
    createAuthorizationOptions: (guildId: string) => ({guildId, label: "Twitch", provider, complete: async () => {}})
}

@Module({
    controllers: [GuildConnectionsController],
    providers: [
        {provide: Client, useValue: client},
        {provide: GuildAccessService, useValue: new GuildAccessService(client, logger)},
        {provide: DiscordLoginService, useValue: login},
        {provide: OAuthFlowService, useValue: flow},
        {provide: SpotifyConnectionService, useValue: spotify},
        {provide: SpotifyService, useValue: {disconnectGuild: async () => {}}},
        {provide: TwitchConnectionService, useValue: twitch},
        {
            provide: SpotifyConfigRepository,
            useValue: {
                findAccountInfoByGuildId: async () => ({
                    clientId: "app-id",
                    clientSecret: "private-secret",
                    accessToken: "private-token",
                    refreshToken: "private-refresh",
                    username: "Listener"
                })
            }
        },
        {
            provide: TwitchAuthRepository,
            useValue: {findIdentityByGuildId: async () => ({username: "Streamer", accessToken: "private-twitch-token"})}
        }
    ]
})
class TestModule {}

beforeAll(async () => {
    app = await NestFactory.create(TestModule, {logger: false})
    await app.listen(0, "127.0.0.1")
    origin = await app.getUrl()
})
beforeEach(() => {
    captured = undefined
    hasProfilePicture = true
    process.env.PUBLIC_URL = "http://127.0.0.1:3000"
    process.env.AUTH_DISCORD_ID = "app-id"
})
afterAll(async () => app.close())
const api = (guild: string, path = "", options: RequestInit = {}) =>
    fetch(`${origin}/dashboard/guilds/${guild}/connections${path}`, options)

test("connection summaries expose account names and app ID, never secrets or tokens", async () => {
    const response = await api("100")
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(await response.json()).toEqual({
        spotify: {username: "Listener", clientId: "app-id"},
        twitch: {username: "Streamer"}
    })
    expect((await api("200")).status).toBe(403)
})

test("profile pictures are fetched separately, require guild access and fall back without failing the account summary", async () => {
    const spotifyAvatar = await api("100", "/spotify/avatar", {redirect: "manual"})
    expect(spotifyAvatar.status).toBe(302)
    expect(spotifyAvatar.headers.get("location")).toBe("https://i.scdn.co/image/spotify-profile")
    expect(spotifyAvatar.headers.get("cache-control")).toContain("no-store")
    const twitchAvatar = await api("100", "/twitch/avatar", {redirect: "manual"})
    expect(twitchAvatar.headers.get("location")).toBe("https://static-cdn.jtvnw.net/twitch-profile.png")
    expect((await api("200", "/spotify/avatar", {redirect: "manual"})).status).toBe(403)
    expect((await api("100", "/unknown/avatar")).status).toBe(400)
    hasProfilePicture = false
    expect((await api("100", "/spotify/avatar")).status).toBe(204)
    expect((await api("100")).status).toBe(200)
})

test("flow creation rejects cross-origin, foreign guilds and malformed credentials", async () => {
    const post = (guild: string, body: unknown, source = "http://127.0.0.1:3000") =>
        api(guild, "/spotify", {
            method: "POST",
            headers: {Origin: source, "Content-Type": "application/json"},
            body: JSON.stringify(body)
        })
    expect((await post("100", {}, "https://attacker.example")).status).toBe(403)
    expect((await post("200", {})).status).toBe(403)
    expect((await post("100", {clientSecret: []})).status).toBe(400)
    expect(captured).toBeUndefined()
})

test("web flow is bound to its guild, initiator and exact Discord session", async () => {
    const response = await api("100", "/twitch", {
        method: "POST",
        headers: {Origin: "http://127.0.0.1:3000", "Content-Type": "application/json"},
        body: "{}"
    })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({url: "https://provider.example/authorize"})
    expect(captured?.guildId).toBe("100")
    expect(captured?.userId).toBe("99")
    expect(captured?.returnTo).toBe("http://127.0.0.1:3000/dashboard/100")
    expect(captured?.sessionId).toBe("session-a")
})
