import {isMediaWidget, type EditorWidget, type OverlayAsset} from "@streamcat/interfaces"
import {widgetModule} from "../registry"

export function widgetName(widget: EditorWidget, assets: OverlayAsset[] = []) {
    const name = widgetModule(widget.type).label
    if (widget.type === "WINDOW" && widget.params.title && widget.params.title !== name)
        return `${name} · ${widget.params.title}`
    const asset = isMediaWidget(widget) ? assets.find((item) => item.id === widget.params.assetId) : undefined
    return asset ? `${name} · ${asset.fileName}` : name
}
