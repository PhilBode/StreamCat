import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ClockInlineDesign} from "./inline"

export const clockInlineControls = [
    {key: "--scene-text", label: "Zeit"},
    {key: "--clock-date-color", label: "Datum"},
    {key: "--clock-surface", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const clockInlineDesign: WidgetDesign = {
    id: "inline",
    label: "Nebeneinander",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--clock-surface": "transparent"
    },
    colorControls: clockInlineControls,
    component: ClockInlineDesign
}
