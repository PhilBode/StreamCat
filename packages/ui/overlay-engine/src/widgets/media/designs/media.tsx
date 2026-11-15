import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../types"

type MediaWidget = Extract<EditorWidget, {type: "IMAGE" | "VIDEO"}>

export const mediaColorControls = [
    {key: "backgroundColor", label: "Hintergrund"}
] as const satisfies readonly WidgetColorControl[]

export function MediaDesign({widget, assets}: WidgetRenderProps) {
    const mediaWidget = widget as MediaWidget
    const asset = assets.find((item) => item.id === mediaWidget.params.assetId)
    if (!asset) return <div className="overlay-chat-unavailable">Asset nicht verfügbar</div>
    const style = {objectFit: mediaWidget.params.fit ?? "contain"} as const
    return mediaWidget.type === "IMAGE" ? (
        <img className="overlay-media" src={asset.url} alt="" style={style} draggable={false} />
    ) : (
        <video className="overlay-media" src={asset.url} autoPlay loop muted playsInline style={style} />
    )
}
