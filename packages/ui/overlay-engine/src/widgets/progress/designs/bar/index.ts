import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {ProgressBarDesign} from "./bar"

export const progressBarControls = [
    {key: "--scene-text", label: "Text"},
    {key: "--progress-color", label: "Fortschritt"},
    {key: "--progress-track", label: "Leiste"}
] as const satisfies readonly WidgetColorControl[]

export const progressBarDesign: WidgetDesign = {
    id: "bar",
    label: "Leiste",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--progress-track": "#ffffff33"
    },
    colorControls: progressBarControls,
    component: ProgressBarDesign
}
