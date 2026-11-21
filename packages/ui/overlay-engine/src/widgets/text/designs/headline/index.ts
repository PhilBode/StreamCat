import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {TextHeadlineDesign} from "./headline"

export const textHeadlineControls = [
    {key: "--scene-text", label: "Text"},
    {key: "--text-shadow", label: "Schatten"}
] as const satisfies readonly WidgetColorControl[]

export const textHeadlineDesign: WidgetDesign = {
    id: "headline",
    label: "Headline",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--text-shadow": "#00000080"
    },
    colorControls: textHeadlineControls,
    component: TextHeadlineDesign
}
