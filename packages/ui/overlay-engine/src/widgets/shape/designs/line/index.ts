import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ShapeLineDesign} from "./line"

export const shapeLineControls = [
    {key: "--window-bg", label: "Linie"},
    {key: "--shape-border", label: "Rahmen"}
] as const satisfies readonly WidgetColorControl[]

export const shapeLineDesign: WidgetDesign = {
    id: "line",
    label: "Linie",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--shape-border": "transparent"
    },
    colorControls: shapeLineControls,
    component: ShapeLineDesign
}
