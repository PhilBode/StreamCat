import type {WidgetType} from "./overlay"

export type WidgetDesign = {
    label: string
    color: string
    backgroundColor: string
    tokens?: Record<`--${string}`, string>
    appliesTo?: readonly WidgetType[]
}

const DESIGN_ENTRIES = {
    default: {
        label: "Standard",
        color: "#ffffff",
        backgroundColor: "#1b191ca1",
        tokens: {"--window-bg": "#1b191c", "--progress-color": "#1db954"}
    },
    autumn: {
        label: "Herbst",
        color: "#f6aa1c",
        backgroundColor: "#62170854",
        tokens: {"--window-bg": "#220901", "--progress-color": "#941b0c"}
    },
    winter: {
        label: "Winter",
        color: "#d3d2c6",
        backgroundColor: "#6d6d695e",
        tokens: {"--window-bg": "#494d4a", "--progress-color": "#7a879a"}
    }
} as const satisfies Record<string, WidgetDesign>

export type WidgetDesignId = keyof typeof DESIGN_ENTRIES

export const WIDGET_DESIGNS: Record<WidgetDesignId, WidgetDesign> = DESIGN_ENTRIES

export const DEFAULT_WIDGET_DESIGN: WidgetDesignId = "default"

export function widgetDesignOptions(type: WidgetType): WidgetDesignId[] {
    return (Object.keys(WIDGET_DESIGNS) as WidgetDesignId[]).filter((id) => {
        const appliesTo = WIDGET_DESIGNS[id].appliesTo
        return !appliesTo || appliesTo.includes(type)
    })
}
