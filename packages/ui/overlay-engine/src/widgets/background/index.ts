import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {backgroundAnimatedDesign} from "./designs/animated"
import {backgroundSolidDesign} from "./designs/solid"
import {BackgroundGlyph} from "./logic/background-glyph"
import {BackgroundSettings} from "./logic/background-settings"

function backgroundSummary(widget: EditorWidget) {
    if (widget.type !== "BACKGROUND") return null
    return `${widget.params.speedSeconds}s - Weichzeichnen ${widget.params.blur} - Abdunklung ${widget.params.dim}`
}

export const backgroundModule: WidgetModule = {
    type: "BACKGROUND",
    label: "Hintergrund",
    description: "Animierter Verlauf oder einfarbige Szenenfläche.",
    category: "Szene",
    glyph: BackgroundGlyph,
    addable: true,
    defaultDesign: "animated",
    designs: {
        animated: backgroundAnimatedDesign,
        solid: backgroundSolidDesign
    },
    settings: BackgroundSettings,
    sectionLabel: "Hintergrund",
    sectionSummary: backgroundSummary,
    nameFor: () => "Hintergrund",
    titleFor: () => "Hintergrund",
    frame: "none"
}
