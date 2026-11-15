import {MIN_WIDGET_WIDTH, MIN_WIDGET_HEIGHT, type EditorWidget, type OverlayLayout} from "@streamcat/interfaces"
import {resizeLockedWindow} from "../widgets/window/logic/window-resize"

export function alignmentTargets(layout: OverlayLayout, widgetId: string) {
    const vertical = [0, layout.width / 2, layout.width, ...(layout.guides?.vertical ?? [])]
    const horizontal = [0, layout.height / 2, layout.height, ...(layout.guides?.horizontal ?? [])]
    for (const widget of layout.widgets) {
        if (widget.id === widgetId) continue
        vertical.push(widget.x, widget.x + widget.width / 2, widget.x + widget.width)
        horizontal.push(widget.y, widget.y + widget.height / 2, widget.y + widget.height)
    }
    return {vertical, horizontal}
}

export function matchedAlignmentLines(widget: EditorWidget, layout: OverlayLayout) {
    const targets = alignmentTargets(layout, widget.id)
    const x = [widget.x, widget.x + widget.width / 2, widget.x + widget.width]
    const y = [widget.y, widget.y + widget.height / 2, widget.y + widget.height]
    return {
        vertical: [
            ...new Set(targets.vertical.filter((target) => x.some((anchor) => Math.abs(anchor - target) < 0.01)))
        ],
        horizontal: [
            ...new Set(targets.horizontal.filter((target) => y.some((anchor) => Math.abs(anchor - target) < 0.01)))
        ]
    }
}

// Compare in scene pixels; the caller converts the six-screen-pixel tolerance.
function snap(position: number, anchors: number[], targets: number[], tolerance: number, min: number, max: number) {
    let result: {position: number; line?: number} = {position}
    let distance = tolerance
    for (const target of targets)
        for (const anchor of anchors) {
            const candidate = target - anchor
            const difference = Math.abs(candidate - position)
            if (candidate < min || candidate > max || difference > distance) continue
            if (result.line !== undefined && difference === distance) continue
            result = {position: candidate, line: target}
            distance = difference
        }
    return result
}

export function snapWidget(
    widget: EditorWidget,
    layout: OverlayLayout,
    tolerance: number,
    corner?: "nw" | "ne" | "sw" | "se"
) {
    const targets = alignmentTargets(layout, widget.id)
    if (!corner) {
        const x = snap(
            widget.x,
            [0, widget.width / 2, widget.width],
            targets.vertical,
            tolerance,
            0,
            layout.width - widget.width
        )
        const y = snap(
            widget.y,
            [0, widget.height / 2, widget.height],
            targets.horizontal,
            tolerance,
            0,
            layout.height - widget.height
        )
        return {widget: {...widget, x: x.position, y: y.position}, vertical: x.line, horizontal: y.line}
    }
    const west = corner.endsWith("w")
    const north = corner.startsWith("n")
    const right = widget.x + widget.width
    const bottom = widget.y + widget.height
    const x = snap(
        west ? widget.x : right,
        [0],
        targets.vertical,
        tolerance,
        west ? 0 : widget.x + MIN_WIDGET_WIDTH,
        west ? right - MIN_WIDGET_WIDTH : layout.width
    )
    const y = snap(
        north ? widget.y : bottom,
        [0],
        targets.horizontal,
        tolerance,
        north ? 0 : widget.y + MIN_WIDGET_HEIGHT,
        north ? bottom - MIN_WIDGET_HEIGHT : layout.height
    )
    if (widget.type === "WINDOW" && widget.params.lockContentAspectRatio) {
        const candidates = []
        if (x.line !== undefined) {
            const next = resizeLockedWindow(
                widget,
                layout,
                corner,
                west ? right - x.position : x.position - widget.x,
                widget.height,
                "width"
            )
            if (Math.abs((west ? next.x : next.x + next.width) - x.position) < 0.01)
                candidates.push({
                    widget: next,
                    vertical: x.line,
                    distance: Math.abs(x.position - (west ? widget.x : right))
                })
        }
        if (y.line !== undefined) {
            const next = resizeLockedWindow(
                widget,
                layout,
                corner,
                widget.width,
                north ? bottom - y.position : y.position - widget.y,
                "height"
            )
            if (Math.abs((north ? next.y : next.y + next.height) - y.position) < 0.01)
                candidates.push({
                    widget: next,
                    horizontal: y.line,
                    distance: Math.abs(y.position - (north ? widget.y : bottom))
                })
        }
        // One edge drives the size; independently snapping both axes would stretch the content.
        return candidates.sort((a, b) => a.distance - b.distance)[0] ?? {widget}
    }
    const left = west ? x.position : widget.x
    const top = north ? y.position : widget.y
    return {
        widget: {
            ...widget,
            x: left,
            y: top,
            width: (west ? right : x.position) - left,
            height: (north ? bottom : y.position) - top
        },
        vertical: x.line,
        horizontal: y.line
    }
}
