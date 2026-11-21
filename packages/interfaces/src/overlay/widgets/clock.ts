import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type ClockDateStyle = "dmy-dot" | "dmy-slash" | "mdy-slash" | "ymd-dash"

export type ClockWidgetParams = WidgetAppearance & {
    timeZone: string
    dateStyle: ClockDateStyle
    hour12: boolean
    showSeconds: boolean
    showDate: boolean
}

const DATE_STYLES = ["dmy-dot", "dmy-slash", "mdy-slash", "ymd-dash"] as const

function booleanValue(value: unknown, fallback: boolean): boolean {
    if (value === undefined) return fallback
    if (typeof value !== "boolean") throw new WidgetParamError("Ungültige Uhr-Einstellung.")
    return value
}

function dateStyleValue(value: unknown): ClockDateStyle {
    if (value === undefined) return "dmy-dot"
    if (typeof value === "string" && DATE_STYLES.includes(value as ClockDateStyle)) return value as ClockDateStyle
    throw new WidgetParamError("Ungültiges Datumsformat.")
}

function validTimeZone(value: string): boolean {
    if (!value) return true
    try {
        new Intl.DateTimeFormat("en", {timeZone: value})
        return true
    } catch {
        return false
    }
}

export const clockSpec: WidgetSpec<ClockWidgetParams> = {
    width: 320,
    height: 80,
    defaults(appearance) {
        return {
            ...appearance,
            timeZone: "",
            dateStyle: "dmy-dot",
            hour12: false,
            showSeconds: false,
            showDate: true
        }
    },
    parse(raw, {appearance}) {
        const timeZone = typeof raw.timeZone === "string" ? raw.timeZone.trim() : ""
        if (timeZone && !validTimeZone(timeZone)) throw new WidgetParamError("Ungültige Zeitzone.")
        return {
            ...appearance,
            timeZone,
            dateStyle: dateStyleValue(raw.dateStyle),
            hour12: booleanValue(raw.hour12, false),
            showSeconds: booleanValue(raw.showSeconds, false),
            showDate: booleanValue(raw.showDate, true)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        const timeZone =
            typeof raw.timeZone === "string" && validTimeZone(raw.timeZone.trim()) ? raw.timeZone.trim() : ""
        const dateStyle = DATE_STYLES.includes(raw.dateStyle as ClockDateStyle)
            ? (raw.dateStyle as ClockDateStyle)
            : "dmy-dot"
        return {
            ...appearance,
            timeZone,
            dateStyle,
            hour12: raw.hour12 === true,
            showSeconds: raw.showSeconds === true,
            showDate: raw.showDate !== false
        }
    }
}
