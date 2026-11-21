import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type ProgressWidgetParams = WidgetAppearance & {
    label: string
    current: number
    target: number
    showValue: boolean
}

function numberValue(value: unknown, fallback: number, max: number): number {
    if (value === undefined) return fallback
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)
        throw new WidgetParamError("Ungültige Fortschritts-Einstellung.")
    return value
}

function safeNumber(value: unknown, fallback: number, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback
}

export const progressSpec: WidgetSpec<ProgressWidgetParams> = {
    width: 600,
    height: 90,
    defaults(appearance) {
        return {
            ...appearance,
            label: "Ziel",
            current: 0,
            target: 100,
            showValue: true
        }
    },
    parse(raw, {appearance}) {
        if (raw.showValue !== undefined && typeof raw.showValue !== "boolean")
            throw new WidgetParamError("Ungültige Fortschritts-Einstellung.")
        return {
            ...appearance,
            label: typeof raw.label === "string" && raw.label.length <= 80 ? raw.label : "Ziel",
            current: numberValue(raw.current, 0, 1_000_000_000),
            target: numberValue(raw.target, 100, 1_000_000_000),
            showValue: raw.showValue !== false
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            label: typeof raw.label === "string" ? raw.label.slice(0, 80) : "Ziel",
            current: safeNumber(raw.current, 0, 1_000_000_000),
            target: safeNumber(raw.target, 100, 1_000_000_000),
            showValue: raw.showValue !== false
        }
    }
}
