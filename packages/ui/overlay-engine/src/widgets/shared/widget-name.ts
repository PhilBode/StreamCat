import type {EditorWidget, OverlayAsset} from "@streamcat/interfaces"
import {widgetModule} from "../registry"

export function widgetName(widget: EditorWidget, assets: OverlayAsset[] = []) {
    if (widget.label) return widget.label
    const module = widgetModule(widget.type)
    return module.nameFor?.(widget, assets) ?? module.label
}
