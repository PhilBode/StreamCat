import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {shapeEllipseDesign} from "./designs/ellipse"
import {shapeLineDesign} from "./designs/line"
import {shapeRectDesign} from "./designs/rect"
import {ShapeGlyph} from "./logic/shape-glyph"
import {ShapeSettings} from "./logic/shape-settings"

function shapeSummary(widget: EditorWidget) {
    if (widget.type !== "SHAPE") return null
    return `Radius ${widget.params.radius} - Deckkraft ${widget.params.opacity}`
}

export const shapeModule: WidgetModule = {
    type: "SHAPE",
    label: "Form",
    description: "Taskbar, Linie, Fläche oder Ellipse.",
    category: "Szene",
    glyph: ShapeGlyph,
    addable: true,
    defaultDesign: "rect",
    designs: {
        rect: shapeRectDesign,
        line: shapeLineDesign,
        ellipse: shapeEllipseDesign
    },
    settings: ShapeSettings,
    sectionLabel: "Form",
    sectionSummary: shapeSummary,
    nameFor: () => "Form",
    titleFor: () => "Form",
    frame: "none"
}
