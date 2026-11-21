import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ClockStackedDesign} from "./stacked"

export const clockStackedControls = [
    {key: "--scene-text", label: "Zeit"},
    {key: "--clock-date-color", label: "Datum"},
    {key: "--clock-surface", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const clockStackedDesign: WidgetDesign = {
    id: "stacked",
    label: "Untereinander",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--clock-surface": "transparent"
    },
    colorControls: clockStackedControls,
    component: ClockStackedDesign
}
