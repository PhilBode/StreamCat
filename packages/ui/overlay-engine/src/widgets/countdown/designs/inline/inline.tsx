import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import {CountdownContent} from "../../logic/countdown-content"
import "./inline.css"

type CountdownWidget = Extract<EditorWidget, {type: "COUNTDOWN"}>

export function CountdownInlineDesign({widget}: WidgetRenderProps) {
    return <CountdownContent widget={widget as CountdownWidget} variant="inline" />
}
