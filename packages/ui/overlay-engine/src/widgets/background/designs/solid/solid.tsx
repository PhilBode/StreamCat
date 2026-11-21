import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import "./solid.css"

type BackgroundWidget = Extract<EditorWidget, {type: "BACKGROUND"}>

export function BackgroundSolidDesign({widget}: WidgetRenderProps) {
    const params = (widget as BackgroundWidget).params
    return <div className="overlay-background-solid" style={{opacity: 1 - params.dim}} />
}
