import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../../types"
import {WindowFrame} from "../../../shared/window-frame"
import "./windowed.css"

type WindowWidget = Extract<EditorWidget, {type: "WINDOW"}>

export const windowColorControls = [
    {key: "color", label: "Titelfarbe"},
    {key: "backgroundColor", label: "Innenfläche"},
    {key: "--window-bg", label: "Rahmen"}
] as const satisfies readonly WidgetColorControl[]

export function WindowDesign({widget, title}: WidgetRenderProps) {
    return <WindowFrame title={title} greenScreen={(widget as WindowWidget).params.greenScreen === true} />
}
