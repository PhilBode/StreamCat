import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {progressBarDesign} from "./designs/bar"
import {ProgressGlyph} from "./logic/progress-glyph"
import {ProgressSettings} from "./logic/progress-settings"

function progressLabel(widget: EditorWidget) {
    if (widget.type !== "PROGRESS") return "Fortschritt"
    return widget.params.label || "Fortschritt"
}

export const progressModule: WidgetModule = {
    type: "PROGRESS",
    label: "Fortschritt",
    description: "Manueller Fortschrittsbalken für Ziele und Meilensteine.",
    category: "Szene",
    glyph: ProgressGlyph,
    addable: true,
    defaultDesign: "bar",
    designs: {
        bar: progressBarDesign
    },
    settings: ProgressSettings,
    sectionLabel: "Fortschritt",
    sectionSummary: (widget) => {
        if (widget.type !== "PROGRESS") return null
        return `${widget.params.current} / ${widget.params.target}`
    },
    nameFor: (widget) => progressLabel(widget),
    titleFor: () => "Fortschritt",
    frame: "widget"
}
