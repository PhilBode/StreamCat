import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {textHeadlineDesign} from "./designs/headline"
import {textPlainDesign} from "./designs/plain"
import {TextGlyph} from "./logic/text-glyph"
import {TextSettings} from "./logic/text-settings"

function textValue(widget: EditorWidget) {
    if (widget.type !== "TEXT") return "Text"
    return widget.params.text || "Text"
}

export const textModule: WidgetModule = {
    type: "TEXT",
    label: "Text",
    description: "Überschrift, Label oder einfacher Text mit Animation.",
    category: "Szene",
    glyph: TextGlyph,
    addable: true,
    defaultDesign: "headline",
    designs: {
        headline: textHeadlineDesign,
        plain: textPlainDesign
    },
    settings: TextSettings,
    sectionLabel: "Text",
    sectionSummary: (widget) => {
        if (widget.type !== "TEXT") return null
        return `${textValue(widget).slice(0, 40)} - ${widget.params.animation}`
    },
    nameFor: (widget) => textValue(widget).slice(0, 40),
    titleFor: (widget) => textValue(widget),
    frame: "widget"
}
