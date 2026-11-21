import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import "./bar.css"

type ProgressWidget = Extract<EditorWidget, {type: "PROGRESS"}>

export function ProgressBarDesign({widget}: WidgetRenderProps) {
    const params = (widget as ProgressWidget).params
    const percent = params.target > 0 ? Math.min(100, Math.max(0, (params.current / params.target) * 100)) : 0
    return (
        <div className="overlay-progress-widget">
            <div className="overlay-progress-head">
                <span className="overlay-progress-label">{params.label}</span>
                {params.showValue && (
                    <span className="overlay-progress-value">
                        {params.current} / {params.target}
                    </span>
                )}
            </div>
            <div className="overlay-progress-track">
                <div className="overlay-progress-fill-widget" style={{width: `${percent}%`}} />
            </div>
        </div>
    )
}
