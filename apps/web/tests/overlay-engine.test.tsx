import {expect, test} from "bun:test"
import {renderToStaticMarkup} from "react-dom/server"
import {
    EMPTY_PLAYBACK,
    OverlayEditor,
    OverlayPlayer,
    OverlayRenderer,
    type OverlayRequest
} from "@streamcat/overlay-engine"
import {OVERLAY_HEIGHT, OVERLAY_WIDTH, type EditorWidget, type OverlayLayout} from "@streamcat/interfaces"

const layout: OverlayLayout = {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    theme: "default",
    widgets: []
}
const chat = {channel: null, url: null}
const request = (async () => ({})) as OverlayRequest
const spotifyWidget: EditorWidget = {
    id: "spotify",
    type: "SPOTIFY_NOW_PLAYING",
    x: 0,
    y: 0,
    width: 640,
    height: 300,
    zIndex: 1,
    params: {design: "missing", color: "#ffffff", backgroundColor: "#000000"}
}
const spotifyLayout: OverlayLayout = {...layout, widgets: [spotifyWidget]}
const styledSpotifyLayout: OverlayLayout = {
    ...layout,
    widgets: [
        {
            ...spotifyWidget,
            params: {
                ...spotifyWidget.params,
                design: "default",
                designColors: {"--progress-color": "#ff0000"}
            }
        }
    ]
}
const chatWidget: EditorWidget = {
    id: "chat",
    type: "TWITCH_CHAT",
    x: 0,
    y: 0,
    width: 440,
    height: 560,
    zIndex: 1,
    params: {design: "none", color: "#ffffff", backgroundColor: "#000000"}
}
const plainChatLayout: OverlayLayout = {...layout, widgets: [chatWidget]}
const windowedChatLayout: OverlayLayout = {
    ...layout,
    widgets: [{...chatWidget, params: {...chatWidget.params, design: "windowed"}}]
}
const windowWidget: EditorWidget = {
    id: "window",
    type: "WINDOW",
    x: 0,
    y: 0,
    width: 640,
    height: 300,
    zIndex: 1,
    params: {design: "default", color: "#ffffff", backgroundColor: "#000000", title: "Testfenster"}
}
const windowLayout: OverlayLayout = {...layout, widgets: [windowWidget]}
const mediaWidget: EditorWidget = {
    id: "media",
    type: "IMAGE",
    x: 0,
    y: 0,
    width: 480,
    height: 270,
    zIndex: 1,
    params: {design: "default", color: "#ffffff", backgroundColor: "#000000", assetId: "missing"}
}
const mediaLayout: OverlayLayout = {...layout, widgets: [mediaWidget]}

test("overlay renderer is available outside the web app", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={layout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain("overlay-renderer")
})

test("overlay renderer falls back to a widget module default design", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={spotifyLayout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain('data-design="default"')
    expect(html).toContain("overlay-window")
})

test("design color overrides reach the renderer", () => {
    const html = renderToStaticMarkup(
        <OverlayRenderer layout={styledSpotifyLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    expect(html).toContain("--progress-color:#ff0000")
})

test("twitch chat designs differ in markup", () => {
    const plain = renderToStaticMarkup(
        <OverlayRenderer layout={plainChatLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    const windowed = renderToStaticMarkup(
        <OverlayRenderer layout={windowedChatLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    expect(plain).toContain("overlay-chat-plain")
    expect(plain).not.toContain("overlay-window")
    expect(windowed).toContain("overlay-window")
    expect(windowed).not.toContain("overlay-chat-plain")
})

test("window and media modules render their design components", () => {
    const windowHtml = renderToStaticMarkup(
        <OverlayRenderer layout={windowLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    const mediaHtml = renderToStaticMarkup(
        <OverlayRenderer layout={mediaLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    expect(windowHtml).toContain("overlay-window")
    expect(windowHtml).toContain("Testfenster")
    expect(mediaHtml).toContain("Asset nicht verfügbar")
})

test("overlay editor renders from the ui package", () => {
    const html = renderToStaticMarkup(
        <OverlayEditor basePath="/dashboard/guilds/1/overlay" request={request} backHref="/dashboard/1" />
    )
    expect(html).toContain("overlay-editor")
    expect(html).toContain("editor-skeleton")
})

test("overlay player renders its loading state", () => {
    const html = renderToStaticMarkup(<OverlayPlayer />)
    expect(html).toContain("obs-overlay")
    expect(html).toContain("Overlay wird geladen")
})
