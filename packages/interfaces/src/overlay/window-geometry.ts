import {OVERLAY_WIDTH, OVERLAY_HEIGHT} from "./constants"
import type {WidgetGeometry} from "./widgets/types"

export const WINDOW_HEADER_HEIGHT = 32.4
export const WINDOW_CONTENT_BORDER = 1
export const WINDOW_CONTENT_RATIO = 16 / 9
export const WINDOW_CORNER_RADIUS = 10.8

export function windowContentBounds(widget: Pick<WidgetGeometry, "x" | "y" | "width" | "height">) {
    return {
        x: widget.x + WINDOW_CONTENT_BORDER,
        y: widget.y + WINDOW_HEADER_HEIGHT,
        width: widget.width - 2 * WINDOW_CONTENT_BORDER,
        height: widget.height - WINDOW_HEADER_HEIGHT - WINDOW_CONTENT_BORDER
    }
}

export function scaleOverlayBounds(
    bounds: Pick<WidgetGeometry, "x" | "y" | "width" | "height">,
    baseWidth: number,
    baseHeight: number
) {
    const scale = Math.min(baseWidth / OVERLAY_WIDTH, baseHeight / OVERLAY_HEIGHT)
    return {
        x: (baseWidth - OVERLAY_WIDTH * scale) / 2 + bounds.x * scale,
        y: (baseHeight - OVERLAY_HEIGHT * scale) / 2 + bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale
    }
}

export function windowHeight(width: number): number {
    return WINDOW_HEADER_HEIGHT + WINDOW_CONTENT_BORDER + (width - 2 * WINDOW_CONTENT_BORDER) / WINDOW_CONTENT_RATIO
}

export function windowWidth(height: number): number {
    return 2 * WINDOW_CONTENT_BORDER + (height - WINDOW_HEADER_HEIGHT - WINDOW_CONTENT_BORDER) * WINDOW_CONTENT_RATIO
}
