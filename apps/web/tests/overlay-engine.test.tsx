import {expect, test} from "bun:test"
import {renderToStaticMarkup} from "react-dom/server"
import {
    EMPTY_PLAYBACK,
    OverlayEditor,
    OverlayPlayer,
    OverlayRenderer,
    type OverlayRequest
} from "@streamcat/overlay-engine"
import {OVERLAY_HEIGHT, OVERLAY_WIDTH, type OverlayLayout} from "@streamcat/interfaces"

const layout: OverlayLayout = {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    theme: "default",
    widgets: []
}
const chat = {channel: null, url: null}
const request = (async () => ({})) as OverlayRequest

test("overlay renderer is available outside the web app", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={layout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain("overlay-renderer")
})

test("overlay editor renders from the ui package", () => {
    const html = renderToStaticMarkup(
        <OverlayEditor basePath="/dashboard/guilds/1/overlay" request={request} backHref="/dashboard/1" />
    )
    expect(html).toContain("overlay-editor")
    expect(html).toContain("Overlay gestalten")
})

test("overlay player renders its loading state", () => {
    const html = renderToStaticMarkup(<OverlayPlayer />)
    expect(html).toContain("obs-overlay")
    expect(html).toContain("Overlay wird geladen")
})
