import type {CSSProperties} from "react"
import type {EditorWidget} from "@streamcat/interfaces"
import "../designs/shape-base.css"

type ShapeWidget = Extract<EditorWidget, {type: "SHAPE"}>

export function ShapeContent({widget, variant}: {widget: ShapeWidget; variant: "rect" | "line" | "ellipse"}) {
    const style = {
        "--shape-radius": `${widget.params.radius}px`,
        opacity: widget.params.opacity
    } as CSSProperties
    return <div className={`overlay-shape overlay-shape--${variant}`} style={style} />
}
