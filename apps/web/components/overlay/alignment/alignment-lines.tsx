import type {EditorWidget, OverlayLayout} from "@streamcat/interfaces"
import {matchedAlignmentLines} from "./snap"

export function AlignmentLines({layout, selected}: {layout: OverlayLayout; selected?: EditorWidget}) {
    const matches = selected ? matchedAlignmentLines(selected, layout) : {vertical: [], horizontal: []}
    return (
        <div className="overlay-guide-lines" aria-hidden="true">
            {(["vertical", "horizontal"] as const).map((axis) => {
                const end = axis === "vertical" ? layout.width : layout.height
                const values = matches[axis]
                return values.map((value) => {
                    const edgeEnd = end - value < (axis === "vertical" ? 200 : 60)
                    // Keep the full stroke and coordinate label inside the canvas at its far edges.
                    const position = Math.min(value, end - 4)
                    return (
                        <div
                            key={`${axis}-${value}`}
                            className={`overlay-guide-line ${axis} snapped ${edgeEnd ? "edge-end" : ""}`}
                            style={axis === "vertical" ? {left: position} : {top: position}}
                        >
                            <span>
                                {axis === "vertical" ? "X" : "Y"} {value}
                            </span>
                        </div>
                    )
                })
            })}
        </div>
    )
}
