import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {BackgroundSolidDesign} from "./solid"

export const backgroundSolidControls = [
    {key: "--gradient-start", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const backgroundSolidDesign: WidgetDesign = {
    id: "solid",
    label: "Einfarbig",
    color: "#ffffff",
    backgroundColor: "transparent",
    colorControls: backgroundSolidControls,
    component: BackgroundSolidDesign
}
