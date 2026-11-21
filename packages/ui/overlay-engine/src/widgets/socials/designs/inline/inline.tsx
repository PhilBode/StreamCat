import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import {SocialsContent} from "../../logic/socials-content"
import "./inline.css"

type SocialsWidget = Extract<EditorWidget, {type: "SOCIALS"}>

export function SocialsInlineDesign({widget, chat}: WidgetRenderProps) {
    return <SocialsContent widget={widget as SocialsWidget} chat={chat} variant="inline" />
}
