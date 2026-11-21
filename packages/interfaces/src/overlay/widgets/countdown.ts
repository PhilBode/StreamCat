import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type CountdownWidgetParams = WidgetAppearance & {
    target: string
    label: string
    completeText: string
    format: "dhms" | "hms" | "ms"
}

const FORMATS = ["dhms", "hms", "ms"] as const

function textValue(value: unknown, fallback: string, max: number): string {
    if (value === undefined) return fallback
    if (typeof value !== "string" || value.length > max) throw new WidgetParamError("Ungültige Countdown-Einstellung.")
    return value
}

function formatValue(value: unknown): "dhms" | "hms" | "ms" {
    if (value === undefined) return "dhms"
    if (typeof value === "string" && FORMATS.includes(value as (typeof FORMATS)[number]))
        return value as (typeof FORMATS)[number]
    throw new WidgetParamError("Ungültiges Countdown-Format.")
}

function validTarget(value: string): boolean {
    return !value || Number.isFinite(Date.parse(value))
}

export const countdownSpec: WidgetSpec<CountdownWidgetParams> = {
    width: 520,
    height: 140,
    defaults(appearance) {
        return {
            ...appearance,
            target: "",
            label: "Countdown",
            completeText: "Jetzt!",
            format: "dhms"
        }
    },
    parse(raw, {appearance}) {
        const target = textValue(raw.target, "", 60)
        if (!validTarget(target)) throw new WidgetParamError("Ungültiges Countdown-Datum.")
        return {
            ...appearance,
            target,
            label: textValue(raw.label, "Countdown", 80),
            completeText: textValue(raw.completeText, "Jetzt!", 80),
            format: formatValue(raw.format)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        const target =
            typeof raw.target === "string" && raw.target.length <= 60 && validTarget(raw.target) ? raw.target : ""
        const format = FORMATS.includes(raw.format as (typeof FORMATS)[number])
            ? (raw.format as (typeof FORMATS)[number])
            : "dhms"
        return {
            ...appearance,
            target,
            label: typeof raw.label === "string" ? raw.label.slice(0, 80) : "Countdown",
            completeText: typeof raw.completeText === "string" ? raw.completeText.slice(0, 80) : "Jetzt!",
            format
        }
    }
}
