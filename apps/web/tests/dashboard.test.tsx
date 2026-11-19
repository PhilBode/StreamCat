import {expect, test} from "bun:test"
import {renderToStaticMarkup} from "react-dom/server"
import type {DashboardConnections, SongRequestSettings} from "@streamcat/interfaces"
import {Connections} from "../components/dashboard/connections"
import {SongRequests} from "../components/dashboard/song-requests/song-requests"

const emptySettings: SongRequestSettings = {
    channelId: null,
    assigned: false,
    enabled: false,
    chatCommandEnabled: false,
    rewardIds: []
}

const noConnections: DashboardConnections = {twitch: null, spotify: null}

test("song request controls stay hidden when neither service is connected", () => {
    const html = renderToStaticMarkup(
        <SongRequests guildId="100" initialSettings={emptySettings} initialRewards={[]} connections={noConnections} />
    )
    expect(html).not.toContain("Kanalpunkte-Belohnung")
    expect(html).not.toContain("Songs per !sr annehmen")
})

test("song request controls appear when a service is connected", () => {
    const html = renderToStaticMarkup(
        <SongRequests
            guildId="100"
            initialSettings={emptySettings}
            initialRewards={[]}
            connections={{twitch: {username: "streamer"}, spotify: null}}
        />
    )
    expect(html).toContain("Kanalpunkte-Belohnung")
    expect(html).toContain("Songs per !sr annehmen")
})

test("spotify setup explains where the app credentials come from", () => {
    const html = renderToStaticMarkup(
        <Connections guildId="100" initialConnections={noConnections} initialPlayback={null} />
    )
    expect(html).toContain("So bekommst du Client-ID &amp; Secret")
    expect(html).toContain('href="https://developer.spotify.com/dashboard"')
    expect(html).toContain("developer.spotify.com/dashboard")
    expect(html).toContain("https://deine-public-url/callback/spotify")
    expect(html).toContain('class="connection-form-actions"')
})

test("spotify setup uses the configured public callback URL", () => {
    const html = renderToStaticMarkup(
        <Connections
            guildId="100"
            initialConnections={noConnections}
            initialPlayback={null}
            spotifyRedirectUri="https://streamcat.example.com/callback/spotify"
        />
    )
    expect(html).toContain("https://streamcat.example.com/callback/spotify")
    expect(html).not.toContain("deine-public-url")
})
