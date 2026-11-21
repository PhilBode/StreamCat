import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import {formatClockDate, formatClockTime} from "../../logic/clock-format"
import {useClock} from "../../logic/use-clock"
import "../clock-base.css"
import "./stacked.css"

type ClockWidget = Extract<EditorWidget, {type: "CLOCK"}>

export function ClockStackedDesign({widget}: WidgetRenderProps) {
    const params = (widget as ClockWidget).params
    const now = useClock()
    return (
        <div className="overlay-clock overlay-clock-stacked">
            <span className="overlay-clock-time">{now ? formatClockTime(now, params) : ""}</span>
            {params.showDate && <span className="overlay-clock-date">{now ? formatClockDate(now, params) : ""}</span>}
        </div>
    )
}
