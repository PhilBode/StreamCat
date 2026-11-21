import type {CSSProperties} from "react"
import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import "./animated.css"

type BackgroundWidget = Extract<EditorWidget, {type: "BACKGROUND"}>

export function BackgroundAnimatedDesign({widget}: WidgetRenderProps) {
    const params = (widget as BackgroundWidget).params
    const style = {
        "--background-speed": `${params.speedSeconds}s`,
        "--background-blur": `${params.blur}px`
    } as CSSProperties
    return (
        <div className="overlay-background" style={style}>
            <div className="overlay-background-gradient" />
            <div className="overlay-background-dim" style={{opacity: params.dim}} />
        </div>
    )
}
