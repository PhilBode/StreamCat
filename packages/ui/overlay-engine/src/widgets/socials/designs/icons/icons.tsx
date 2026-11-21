import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetRenderProps} from "../../../types"
import {SocialsContent} from "../../logic/socials-content"
import "./icons.css"

type SocialsWidget = Extract<EditorWidget, {type: "SOCIALS"}>

export function SocialsIconsDesign({widget, chat}: WidgetRenderProps) {
    return <SocialsContent widget={widget as SocialsWidget} chat={chat} variant="icons" />
}
