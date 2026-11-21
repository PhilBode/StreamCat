import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ShapeRectDesign} from "./rect"

export const shapeRectControls = [
    {key: "--window-bg", label: "Füllung"},
    {key: "--shape-border", label: "Rahmen"}
] as const satisfies readonly WidgetColorControl[]

export const shapeRectDesign: WidgetDesign = {
    id: "rect",
    label: "Rechteck",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--shape-border": "transparent"
    },
    colorControls: shapeRectControls,
    component: ShapeRectDesign
}
