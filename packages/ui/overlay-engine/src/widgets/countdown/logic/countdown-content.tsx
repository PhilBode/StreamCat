import type {EditorWidget} from "@streamcat/interfaces"
import {formatCountdown} from "./countdown-format"
import {useCountdown} from "./use-countdown"
import "../designs/countdown-base.css"

type CountdownWidget = Extract<EditorWidget, {type: "COUNTDOWN"}>

export function CountdownContent({widget, variant}: {widget: CountdownWidget; variant: "stacked" | "inline"}) {
    const params = widget.params
    const remaining = useCountdown(params.target)
    const time =
        remaining === null ? "" : remaining === 0 ? params.completeText : formatCountdown(remaining, params.format)
    return (
        <div className={`overlay-countdown overlay-countdown--${variant}`}>
            {params.label && <span className="overlay-countdown-label">{params.label}</span>}
            <span className="overlay-countdown-time">{time}</span>
        </div>
    )
}
