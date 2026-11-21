import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {BackgroundAnimatedDesign} from "./animated"

export const backgroundAnimatedControls = [
    {key: "--gradient-start", label: "Verlauf Start"},
    {key: "--gradient-end", label: "Verlauf Ende"},
    {key: "--background-dim", label: "Abdunklung"}
] as const satisfies readonly WidgetColorControl[]

export const backgroundAnimatedDesign: WidgetDesign = {
    id: "animated",
    label: "Animiert",
    color: OVERLAY_COLOR_TEMPLATES.standard.color,
    backgroundColor: "transparent",
    tokens: {
        "--background-dim": "#000000"
    },
    colorControls: backgroundAnimatedControls,
    component: BackgroundAnimatedDesign
}
