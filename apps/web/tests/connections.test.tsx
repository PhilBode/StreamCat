import {expect, test} from "bun:test"
import {renderToStaticMarkup} from "react-dom/server"
import {Connections} from "../components/dashboard/connections"

test("pending accounts never appear disconnected and cannot start auth before loading", () => {
    const html = renderToStaticMarkup(<Connections guildId="100" />)
    expect(html).toContain('aria-label="Verbundene Konten werden geladen"')
    expect(html).toContain('role="status"')
    expect(html).not.toContain("Noch kein Konto")
    expect(html).not.toContain("Nicht eingerichtet")
    const connectButtons = html.match(/<button\b[^>]*>(?:Twitch|Spotify) verbinden[^<]*<\/button>/g) ?? []
    expect(connectButtons).toHaveLength(0)
    expect(html).not.toContain('id="spotify-client-secret"')
})
