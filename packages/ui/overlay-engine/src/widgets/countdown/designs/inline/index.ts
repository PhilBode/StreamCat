import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {CountdownInlineDesign} from "./inline"

export const countdownInlineControls = [
    {key: "--scene-text", label: "Zeit"},
    {key: "--countdown-label-color", label: "Label"},
    {key: "--countdown-surface", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const countdownInlineDesign: WidgetDesign = {
    id: "inline",
    label: "Nebeneinander",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--countdown-surface": "transparent"
    },
    colorControls: countdownInlineControls,
    component: CountdownInlineDesign
}
