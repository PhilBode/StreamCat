import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {CountdownStackedDesign} from "./stacked"

export const countdownStackedControls = [
    {key: "--scene-text", label: "Zeit"},
    {key: "--countdown-label-color", label: "Label"},
    {key: "--countdown-surface", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const countdownStackedDesign: WidgetDesign = {
    id: "stacked",
    label: "Untereinander",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--countdown-surface": "transparent"
    },
    colorControls: countdownStackedControls,
    component: CountdownStackedDesign
}
