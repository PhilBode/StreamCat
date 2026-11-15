import type {OverlayColorTemplate} from "@streamcat/interfaces"
import type {ComponentType} from "react"
import type {WidgetColorControl, WidgetDesign, WidgetRenderProps, WidgetSettingsProps} from "../types"

export function designFromTemplate(
    id: string,
    template: OverlayColorTemplate,
    component: ComponentType<WidgetRenderProps>,
    colorControls: readonly WidgetColorControl[],
    options: {label?: string; settings?: ComponentType<WidgetSettingsProps>} = {}
): WidgetDesign {
    return {
        id,
        label: options.label ?? template.label,
        color: template.color,
        backgroundColor: template.backgroundColor,
        tokens: template.tokens,
        colorControls,
        component,
        ...(options.settings ? {settings: options.settings} : {})
    }
}
