import type {CSSProperties} from "react"
import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import "./marquee.css"

type TickerWidget = Extract<EditorWidget, {type: "TICKER"}>

export function TickerDesign({widget}: WidgetRenderProps) {
    const params = (widget as TickerWidget).params
    const style = {"--ticker-speed": `${params.speedSeconds}s`} as CSSProperties
    return (
        <div className={`overlay-ticker overlay-ticker--${params.direction}`}>
            <div className="overlay-ticker-track" style={style}>
                <span>
                    {params.text}
                    {params.separator}
                </span>
                <span aria-hidden="true">
                    {params.text}
                    {params.separator}
                </span>
            </div>
        </div>
    )
}
