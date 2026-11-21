import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {windowWindowedDesign} from "./designs/windowed"
import {WindowGlyph} from "./logic/window-glyph"
import {WindowSettings} from "./logic/window-settings"

function windowSummary(widget: EditorWidget) {
    if (widget.type !== "WINDOW") return null
    const title = widget.params.title || "Fenstertitel"
    const ratio = widget.params.lockContentAspectRatio === true ? "16:9" : "Frei"
    const green = widget.params.greenScreen === true ? "Greenscreen" : "Kein Greenscreen"
    return `${title} - ${ratio} - ${green}`
}

export const windowModule: WidgetModule = {
    type: "WINDOW",
    label: "Fenster",
    description: "Rahmen für Capture, Kamera oder beliebige Browserquellen.",
    category: "Fenster",
    glyph: WindowGlyph,
    addable: true,
    defaultDesign: "windowed",
    designs: {
        windowed: windowWindowedDesign
    },
    settings: WindowSettings,
    sectionLabel: "Fenster",
    sectionSummary: windowSummary,
    nameFor: (widget, _assets) => {
        if (widget.type !== "WINDOW") return "Fenster"
        const title = widget.params.title
        return title && title !== "Fenster" ? `Fenster · ${title}` : "Fenster"
    },
    titleFor: (widget) => (widget.type === "WINDOW" ? widget.params.title || "Fenster" : "Fenster"),
    frame: "widget"
}
