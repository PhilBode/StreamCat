import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {countdownInlineDesign} from "./designs/inline"
import {countdownStackedDesign} from "./designs/stacked"
import {CountdownGlyph} from "./logic/countdown-glyph"
import {CountdownSettings} from "./logic/countdown-settings"

function countdownLabel(widget: EditorWidget) {
    if (widget.type !== "COUNTDOWN") return "Countdown"
    return widget.params.label || "Countdown"
}

export const countdownModule: WidgetModule = {
    type: "COUNTDOWN",
    label: "Countdown",
    description: "Zähler bis zu einem Datum oder einer Uhrzeit.",
    category: "Szene",
    glyph: CountdownGlyph,
    addable: true,
    defaultDesign: "stacked",
    designs: {
        stacked: countdownStackedDesign,
        inline: countdownInlineDesign
    },
    settings: CountdownSettings,
    sectionLabel: "Countdown",
    sectionSummary: (widget) => {
        if (widget.type !== "COUNTDOWN") return null
        return widget.params.target ? `${widget.params.label} - ${widget.params.format}` : "Kein Ziel"
    },
    nameFor: (widget) => countdownLabel(widget),
    titleFor: () => "Countdown",
    frame: "widget"
}
