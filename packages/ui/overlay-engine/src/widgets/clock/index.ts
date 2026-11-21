import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {clockInlineDesign} from "./designs/inline"
import {clockStackedDesign} from "./designs/stacked"
import {ClockGlyph} from "./logic/clock-glyph"
import {ClockSettings} from "./logic/clock-settings"

function clockSummary(widget: EditorWidget) {
    if (widget.type !== "CLOCK") return null
    const options = [
        widget.params.hour12 ? "12h" : "24h",
        widget.params.showSeconds ? "Sekunden" : null,
        widget.params.showDate ? widget.params.dateStyle : null
    ].filter(Boolean)
    return `${options.join(" · ")} - ${widget.params.timeZone || "System"}`
}

export const clockModule: WidgetModule = {
    type: "CLOCK",
    label: "Uhr",
    description: "Uhrzeit und Datum mit Sprache und Zeitzone.",
    category: "Szene",
    glyph: ClockGlyph,
    addable: true,
    defaultDesign: "stacked",
    designs: {
        stacked: clockStackedDesign,
        inline: clockInlineDesign
    },
    settings: ClockSettings,
    sectionLabel: "Uhr",
    sectionSummary: clockSummary,
    nameFor: () => "Uhr",
    titleFor: () => "Uhr",
    frame: "none"
}
