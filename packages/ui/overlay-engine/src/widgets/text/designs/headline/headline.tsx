import type {CSSProperties} from "react"
import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import "../text-base.css"
import "./headline.css"

type TextWidget = Extract<EditorWidget, {type: "TEXT"}>

export function TextHeadlineDesign({widget}: WidgetRenderProps) {
    const params = (widget as TextWidget).params
    const style = {
        "--text-size": `${params.fontSize}px`,
        "--text-weight": params.fontWeight,
        "--text-spacing": `${params.letterSpacing}px`,
        "--text-animation": `${params.animationSeconds}s`,
        "--text-chars": `${Math.max(1, [...params.text].length)}`
    } as CSSProperties
    return (
        <div
            className={`overlay-text-headline overlay-text-align-${params.align} overlay-text-animation-${params.animation}`}
            style={style}
        >
            <span className="overlay-text-main">{params.text}</span>
        </div>
    )
}
