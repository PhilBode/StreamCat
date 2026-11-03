import {MIN_WIDGET_WIDTH, windowHeight, windowWidth, type EditorWidget, type OverlayLayout} from "@streamcat/interfaces"

export type ResizeCorner = "nw" | "ne" | "sw" | "se"

export function lockedWindowSize(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
    axis: "width" | "height"
) {
    const requested = axis === "width" ? width : windowWidth(height)
    const fittedWidth = Math.max(MIN_WIDGET_WIDTH, Math.min(requested, maxWidth, windowWidth(maxHeight)))
    return {width: fittedWidth, height: Math.min(maxHeight, windowHeight(fittedWidth))}
}

// Keep the opposite corner fixed while resizing the inner content to 16:9.
export function resizeLockedWindow(
    widget: EditorWidget,
    layout: OverlayLayout,
    corner: ResizeCorner,
    width: number,
    height: number,
    axis: "width" | "height"
) {
    const west = corner.endsWith("w")
    const north = corner.startsWith("n")
    const right = widget.x + widget.width
    const bottom = widget.y + widget.height
    const size = lockedWindowSize(
        width,
        height,
        west ? right : layout.width - widget.x,
        north ? bottom : layout.height - widget.y,
        axis
    )
    return {...widget, ...size, x: west ? right - size.width : widget.x, y: north ? bottom - size.height : widget.y}
}
