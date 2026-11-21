import {expect, test} from "bun:test"
import {renderToStaticMarkup} from "react-dom/server"
import {
    EMPTY_PLAYBACK,
    OverlayEditor,
    OverlayPlayer,
    OverlayRenderer,
    type OverlayRequest
} from "@streamcat/overlay-engine"
import {WIDGET_MODULES} from "../../../packages/ui/overlay-engine/src/widgets/registry"
import {
    formatClockDate,
    formatClockTime
} from "../../../packages/ui/overlay-engine/src/widgets/clock/logic/clock-format"
import {
    OVERLAY_HEIGHT,
    OVERLAY_WIDTH,
    overlayPreset,
    type ClockWidgetParams,
    type EditorWidget,
    type OverlayLayout,
    type OverlayScene
} from "@streamcat/interfaces"

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
const themedSpotifyLayout: OverlayLayout = {
    ...layout,
    themeColors: {primary: "#ff8800"},
    widgets: [{...spotifyWidget, params: {...spotifyWidget.params, design: "default"}}]
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
    widgets: [
        {
            ...chatWidget,
            params: {...chatWidget.params, design: "windowed", title: "Demo Chat"}
        }
    ]
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
    type: "MEDIA",
    x: 0,
    y: 0,
    width: 480,
    height: 270,
    zIndex: 1,
    params: {design: "default", color: "#ffffff", backgroundColor: "#000000", assetId: "missing"}
}
const mediaLayout: OverlayLayout = {...layout, widgets: [mediaWidget]}
const sceneWidgets: EditorWidget[] = [
    {
        id: "background",
        type: "BACKGROUND",
        x: 0,
        y: 0,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        zIndex: 0,
        params: {
            design: "animated",
            color: "#ffffff",
            backgroundColor: "transparent",
            speedSeconds: 15,
            blur: 0,
            dim: 0
        }
    },
    {
        id: "text",
        type: "TEXT",
        x: 96,
        y: 54,
        width: 1100,
        height: 180,
        zIndex: 1,
        params: {
            design: "headline",
            color: "#ffffff",
            backgroundColor: "transparent",
            text: "STARTING SOON",
            fontSize: 134.4,
            fontWeight: "bold",
            align: "left",
            animation: "bounce",
            animationSeconds: 1.4,
            letterSpacing: 0
        }
    },
    {
        id: "clock",
        type: "CLOCK",
        x: 1600,
        y: 1026,
        width: 300,
        height: 54,
        zIndex: 2,
        params: {
            design: "stacked",
            color: "#ffffff",
            backgroundColor: "transparent",
            timeZone: "",
            dateStyle: "dmy-dot",
            hour12: false,
            showSeconds: false,
            showDate: true
        }
    },
    {
        id: "socials",
        type: "SOCIALS",
        x: 20,
        y: 1026,
        width: 700,
        height: 54,
        zIndex: 2,
        params: {
            design: "inline",
            color: "#ffffff",
            backgroundColor: "transparent",
            twitch: "demo",
            twitter: "@demo",
            discord: "demo",
            direction: "row",
            showLabels: true,
            showIcons: true
        }
    },
    {
        id: "shape",
        type: "SHAPE",
        x: 0,
        y: 1026,
        width: OVERLAY_WIDTH,
        height: 54,
        zIndex: 1,
        params: {
            design: "rect",
            color: "#ffffff",
            backgroundColor: "transparent",
            radius: 0,
            opacity: 1
        }
    },
    {
        id: "countdown",
        type: "COUNTDOWN",
        x: 700,
        y: 900,
        width: 520,
        height: 140,
        zIndex: 2,
        params: {
            design: "stacked",
            color: "#ffffff",
            backgroundColor: "transparent",
            target: "",
            label: "Countdown",
            completeText: "Jetzt!",
            format: "dhms"
        }
    },
    {
        id: "ticker",
        type: "TICKER",
        x: 0,
        y: 900,
        width: 1200,
        height: 60,
        zIndex: 2,
        params: {
            design: "marquee",
            color: "#ffffff",
            backgroundColor: "transparent",
            text: "Willkommen",
            separator: " • ",
            speedSeconds: 20,
            direction: "left"
        }
    },
    {
        id: "progress",
        type: "PROGRESS",
        x: 0,
        y: 800,
        width: 600,
        height: 90,
        zIndex: 2,
        params: {
            design: "bar",
            color: "#ffffff",
            backgroundColor: "transparent",
            label: "Ziel",
            current: 40,
            target: 100,
            showValue: true
        }
    }
]
const sceneLayout: OverlayLayout = {...layout, widgets: sceneWidgets}

test("overlay renderer is available outside the web app", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={layout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain("overlay-renderer")
})

test("overlay renderer falls back to a widget module default design", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={spotifyLayout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain('data-design="artwork"')
    expect(html).toContain('data-widget-type="SPOTIFY_NOW_PLAYING"')
    expect(html).toContain("overlay-window")
})

test("design color overrides reach the renderer", () => {
    const html = renderToStaticMarkup(
        <OverlayRenderer layout={styledSpotifyLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    expect(html).toContain("--progress-color:#ff0000")
})

test("theme primary reaches widgets that define their own accent token", () => {
    const html = renderToStaticMarkup(
        <OverlayRenderer layout={themedSpotifyLayout} playback={EMPTY_PLAYBACK} chat={chat} />
    )
    expect(html).toContain("--progress-color:#ff8800")
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
    expect(windowed).toContain("Demo Chat")
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

test("scene widgets render as normal overlay widgets", () => {
    const html = renderToStaticMarkup(<OverlayRenderer layout={sceneLayout} playback={EMPTY_PLAYBACK} chat={chat} />)
    expect(html).toContain("overlay-background-gradient")
    expect(html).toContain("overlay-text-headline")
    expect(html).toContain("overlay-clock-stacked")
    expect(html).toContain("overlay-socials")
    expect(html).toContain("overlay-shape")
    expect(html).toContain("overlay-countdown")
    expect(html).toContain("overlay-ticker")
    expect(html).toContain("overlay-progress-widget")
    expect(html).toContain('data-widget-type="BACKGROUND"')
    expect(html).toContain('data-widget-type="TEXT"')
    expect(html).toContain('data-widget-type="CLOCK"')
    expect(html).toContain('data-widget-type="SOCIALS"')
    expect(html).toContain('data-widget-type="SHAPE"')
    expect(html).toContain('data-widget-type="COUNTDOWN"')
    expect(html).toContain('data-widget-type="TICKER"')
    expect(html).toContain('data-widget-type="PROGRESS"')
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

test("every widget module has metadata, a default design and editable colors", () => {
    const modules = Object.values(WIDGET_MODULES)
    for (const definition of modules) {
        expect(definition.label.length).toBeGreaterThan(0)
        expect(definition.description.length).toBeGreaterThan(0)
        expect(definition.sectionLabel.length).toBeGreaterThan(0)
        expect(definition.designs[definition.defaultDesign]).toBeDefined()
        const designs = Object.values(definition.designs)
        for (const design of designs) {
            const keys = design.colorControls.map((control) => control.key)
            expect(keys.length).toBeGreaterThan(0)
            expect(new Set(keys).size).toBe(keys.length)
        }
    }
})

test("clock formatting honors date style, 12h mode and seconds", () => {
    const now = new Date("2026-11-21T15:04:05Z")
    const params: ClockWidgetParams = {
        design: "stacked",
        color: "#ffffff",
        backgroundColor: "transparent",
        timeZone: "Europe/Berlin",
        dateStyle: "dmy-dot",
        hour12: false,
        showSeconds: true,
        showDate: true
    }
    expect(formatClockTime(now, params)).toBe("16:04:05")
    expect(formatClockTime(now, {...params, hour12: true})).toContain("04:04:05")
    expect(formatClockDate(now, params)).toBe("21.11.2026")
    expect(formatClockDate(now, {...params, dateStyle: "ymd-dash"})).toBe("2026-11-21")
})

test("starter presets contain widgetized scene elements", () => {
    const expectations: Record<Exclude<OverlayScene, "widgets">, number> = {
        intermission: 8,
        starting_soon: 8,
        stream_ending: 8
    }
    for (const [scene, count] of Object.entries(expectations) as [Exclude<OverlayScene, "widgets">, number][]) {
        const layout = overlayPreset(scene, [`${scene}-chat`, `${scene}-spotify`])
        expect(layout.widgets).toHaveLength(count)
        const types = new Set(layout.widgets.map((widget) => widget.type))
        expect(types.has("BACKGROUND")).toBe(true)
        expect(types.has("SHAPE")).toBe(true)
        expect(types.has("SOCIALS")).toBe(true)
        expect(types.has("CLOCK")).toBe(true)
        expect(types.has("TWITCH_CHAT")).toBe(true)
        expect(types.has("SPOTIFY_NOW_PLAYING")).toBe(true)
        expect(types.has("TEXT")).toBe(scene !== "intermission")
        const background = layout.widgets.find((widget) => widget.type === "BACKGROUND")
        expect(background).toMatchObject({x: 0, y: 0, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT, zIndex: 0})
        const taskbar = layout.widgets.find((widget) => widget.id.endsWith("-taskbar"))
        expect(taskbar).toMatchObject({x: 0, y: 1026, width: OVERLAY_WIDTH, height: 54, zIndex: 5})
        const socials = layout.widgets.find((widget) => widget.type === "SOCIALS")
        expect(socials).toMatchObject({x: 20, y: 1026, width: 700, height: 54, zIndex: 6})
        const clock = layout.widgets.find((widget) => widget.type === "CLOCK")
        expect(clock).toMatchObject({x: 1600, y: 1026, width: 300, height: 54, zIndex: 6})
        for (const widget of layout.widgets) {
            expect(WIDGET_MODULES[widget.type].designs[widget.params.design]).toBeDefined()
        }
    }
})
