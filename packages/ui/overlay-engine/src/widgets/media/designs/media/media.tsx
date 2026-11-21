import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../../types"
import "./media.css"

type MediaWidget = Extract<EditorWidget, {type: "MEDIA"}>

export const mediaColorControls = [
    {key: "backgroundColor", label: "Hintergrund"}
] as const satisfies readonly WidgetColorControl[]

export function MediaDesign({widget, assets}: WidgetRenderProps) {
    const mediaWidget = widget as MediaWidget
    const asset = assets.find((item) => item.id === mediaWidget.params.assetId)
    if (!asset)
        return (
            <div className="overlay-media-unavailable">
                <span>MEDIUM</span>
                <strong>Asset nicht verfügbar</strong>
            </div>
        )
    const style = {objectFit: mediaWidget.params.fit ?? "contain"} as const
    return asset.kind === "IMAGE" ? (
        <img className="overlay-media" src={asset.url} alt="" style={style} draggable={false} />
    ) : (
        <video className="overlay-media" src={asset.url} autoPlay loop muted playsInline style={style} />
    )
}
