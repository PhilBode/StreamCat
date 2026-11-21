import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import {ShapeContent} from "../../logic/shape-content"
import "./line.css"

type ShapeWidget = Extract<EditorWidget, {type: "SHAPE"}>

export function ShapeLineDesign({widget}: WidgetRenderProps) {
    return <ShapeContent widget={widget as ShapeWidget} variant="line" />
}
