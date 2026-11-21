import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ShapeEllipseDesign} from "./ellipse"

export const shapeEllipseControls = [
    {key: "--window-bg", label: "Fläche"},
    {key: "--shape-border", label: "Rahmen"}
] as const satisfies readonly WidgetColorControl[]

export const shapeEllipseDesign: WidgetDesign = {
    id: "ellipse",
    label: "Ellipse",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--shape-border": "transparent"
    },
    colorControls: shapeEllipseControls,
    component: ShapeEllipseDesign
}
