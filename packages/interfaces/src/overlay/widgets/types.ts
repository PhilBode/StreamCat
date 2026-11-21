import type {WidgetDesignId} from "../widget-designs"

export type WidgetGeometry = {
    id: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number

    label?: string

    hidden?: boolean
}

export type WidgetAppearance = {
    design: WidgetDesignId
    color: string
    backgroundColor: string
    designColors?: Record<`--${string}`, string>
}

export type WidgetParseContext = {
    appearance: WidgetAppearance
    width: number
    height: number
}

export type WidgetSpec<P> = {
    width: number
    height: number
    defaults(appearance: WidgetAppearance): P
    parse(raw: Record<string, unknown>, context: WidgetParseContext): P
    normalize(stored: Record<string, unknown> | null, appearance: WidgetAppearance): P
}

export class WidgetParamError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "WidgetParamError"
    }
}
