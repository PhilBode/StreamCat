import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {TextPlainDesign} from "./plain"

export const textPlainControls = [
    {key: "--scene-text", label: "Text"},
    {key: "--text-shadow", label: "Schatten"}
] as const satisfies readonly WidgetColorControl[]

export const textPlainDesign: WidgetDesign = {
    id: "plain",
    label: "Einfach",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--text-shadow": "#00000080"
    },
    colorControls: textPlainControls,
    component: TextPlainDesign
}
