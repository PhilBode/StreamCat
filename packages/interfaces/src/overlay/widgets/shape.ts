import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type ShapeWidgetParams = WidgetAppearance & {
    radius: number
    opacity: number
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
        throw new WidgetParamError("Ungültige Form-Einstellung.")
    return value
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export const shapeSpec: WidgetSpec<ShapeWidgetParams> = {
    width: 1920,
    height: 54,
    defaults(appearance) {
        return {
            ...appearance,
            radius: 0,
            opacity: 1
        }
    },
    parse(raw, {appearance}) {
        return {
            ...appearance,
            radius: numberValue(raw.radius, 0, 0, 100),
            opacity: numberValue(raw.opacity, 1, 0, 1)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            radius: safeNumber(raw.radius, 0, 0, 100),
            opacity: safeNumber(raw.opacity, 1, 0, 1)
        }
    }
}
