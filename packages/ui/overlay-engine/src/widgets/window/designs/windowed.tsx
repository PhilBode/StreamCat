import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../types"
import {WindowFrame} from "../../shared/window-frame"

type WindowWidget = Extract<EditorWidget, {type: "WINDOW"}>

export const windowColorControls = [
    {key: "color", label: "Textfarbe"},
    {key: "backgroundColor", label: "Hintergrund"},
    {key: "--window-bg", label: "Fensterfläche"},
    {key: "--progress-color", label: "Fortschritt"}
] as const satisfies readonly WidgetColorControl[]

export function WindowDesign({widget, title}: WidgetRenderProps) {
    return <WindowFrame title={title} greenScreen={(widget as WindowWidget).params.greenScreen === true} />
}
