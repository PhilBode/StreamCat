import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type BackgroundWidgetParams = WidgetAppearance & {
    speedSeconds: number
    blur: number
    dim: number
}

function numberInRange(value: unknown, key: string, min: number, max: number): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
        throw new WidgetParamError(`Ungültige Hintergrund-Einstellung: ${key}.`)
    return value
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export const backgroundSpec: WidgetSpec<BackgroundWidgetParams> = {
    width: 1920,
    height: 1080,
    defaults(appearance) {
        return {
            ...appearance,
            speedSeconds: 15,
            blur: 0,
            dim: 0
        }
    },
    parse(raw, {appearance}) {
        return {
            ...appearance,
            speedSeconds: numberInRange(raw.speedSeconds ?? 15, "Geschwindigkeit", 1, 120),
            blur: numberInRange(raw.blur ?? 0, "Weichzeichnen", 0, 50),
            dim: numberInRange(raw.dim ?? 0, "Abdunklung", 0, 1)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            speedSeconds: safeNumber(raw.speedSeconds, 15, 1, 120),
            blur: safeNumber(raw.blur, 0, 0, 50),
            dim: safeNumber(raw.dim, 0, 0, 1)
        }
    }
}
