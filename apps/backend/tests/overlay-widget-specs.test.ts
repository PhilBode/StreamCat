import "reflect-metadata"
import {expect, test} from "bun:test"
import {OVERLAY_HEIGHT, OVERLAY_WIDTH, WIDGET_SPECS, type EditorWidget, type WidgetType} from "@streamcat/interfaces"
import {validateOverlayLayout} from "../src/features/overlays/settings/overlay-layout"

const appearance = {design: "default", color: "#ffffff", backgroundColor: "transparent"}

function widget(type: WidgetType, index: number): EditorWidget {
    const spec = WIDGET_SPECS[type]
    const params = spec.defaults(appearance)
    if (type === "MEDIA") params.assetId = "asset-1"
    return {
        id: `widget-${index}`,
        type,
        x: 0,
        y: 0,
        width: spec.width,
        height: type === "WINDOW" ? 300 : spec.height,
        zIndex: index,
        params
    } as EditorWidget
}

test("every widget spec validates through the layout parser", () => {
    const types = Object.keys(WIDGET_SPECS) as WidgetType[]
    const layout = validateOverlayLayout({
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        theme: "default",
        scene: "widgets",
        font: "tiny5",
        widgets: types.map(widget)
    })
    expect(layout.widgets).toHaveLength(types.length)
    expect(layout.widgets.map((item) => item.type)).toEqual(types)
})

test("scene widget specs reject invalid values", () => {
    const base = widget("TEXT", 0)
    expect(() =>
        validateOverlayLayout({
            width: OVERLAY_WIDTH,
            height: OVERLAY_HEIGHT,
            theme: "default",
            widgets: [{...base, params: {...base.params, fontSize: 1000}}]
        })
    ).toThrow("Ungültige Text-Einstellung.")
    const clock = widget("CLOCK", 1)
    expect(() =>
        validateOverlayLayout({
            width: OVERLAY_WIDTH,
            height: OVERLAY_HEIGHT,
            theme: "default",
            widgets: [{...clock, params: {...clock.params, timeZone: "Not/AZone"}}]
        })
    ).toThrow("Ungültige Zeitzone.")
})
