import type {EditorWidget, OverlayLayout} from "@streamcat/interfaces"

type Direction = "left" | "right" | "above" | "below"
type Distance = {direction: Direction; axis: "horizontal" | "vertical"; x: number; y: number; pixels: number}

// Measure the closest facing edges in each direction. Overlapping widgets have no gap.
export function widgetDistances(widget: EditorWidget, widgets: EditorWidget[]): Distance[] {
    const nearest: Partial<Record<Direction, Distance>> = {}
    function add(distance: Distance) {
        const previous = nearest[distance.direction]
        if (!previous || distance.pixels < previous.pixels) nearest[distance.direction] = distance
    }
    for (const other of widgets) {
        if (other.id === widget.id) continue
        const left = Math.max(widget.x, other.x)
        const right = Math.min(widget.x + widget.width, other.x + other.width)
        const top = Math.max(widget.y, other.y)
        const bottom = Math.min(widget.y + widget.height, other.y + other.height)
        if (bottom > top) {
            const y = (top + bottom) / 2
            if (other.x >= widget.x + widget.width)
                add({
                    direction: "right",
                    axis: "horizontal",
                    x: widget.x + widget.width,
                    y,
                    pixels: other.x - widget.x - widget.width
                })
            if (widget.x >= other.x + other.width)
                add({
                    direction: "left",
                    axis: "horizontal",
                    x: other.x + other.width,
                    y,
                    pixels: widget.x - other.x - other.width
                })
        }
        if (right > left) {
            const x = (left + right) / 2
            if (other.y >= widget.y + widget.height)
                add({
                    direction: "below",
                    axis: "vertical",
                    x,
                    y: widget.y + widget.height,
                    pixels: other.y - widget.y - widget.height
                })
            if (widget.y >= other.y + other.height)
                add({
                    direction: "above",
                    axis: "vertical",
                    x,
                    y: other.y + other.height,
                    pixels: widget.y - other.y - other.height
                })
        }
    }
    return Object.values(nearest)
}

export function WidgetDistances({layout, widget}: {layout: OverlayLayout; widget?: EditorWidget}) {
    if (!widget) return null
    return (
        <div className="overlay-widget-distances" aria-hidden="true">
            {widgetDistances(widget, layout.widgets).map((distance) => (
                <div
                    key={distance.direction}
                    className={`overlay-widget-distance ${distance.axis} ${distance.x > layout.width - 140 ? "edge-end" : ""}`}
                    style={{
                        left: distance.x,
                        top: distance.y,
                        ...(distance.axis === "horizontal" ? {width: distance.pixels} : {height: distance.pixels})
                    }}
                >
                    <span>{Math.round(distance.pixels)} px</span>
                </div>
            ))}
        </div>
    )
}
