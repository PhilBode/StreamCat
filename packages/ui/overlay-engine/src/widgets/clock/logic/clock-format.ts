import type {ClockWidgetParams} from "@streamcat/interfaces"

function zoneOption(params: ClockWidgetParams): {timeZone?: string} {
    return params.timeZone ? {timeZone: params.timeZone} : {}
}

export function formatClockTime(now: Date, params: ClockWidgetParams): string {
    try {
        return new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            ...(params.showSeconds ? {second: "2-digit"} : {}),
            hour12: params.hour12,
            ...zoneOption(params)
        }).format(now).toUpperCase()
    } catch {
        return now.toLocaleTimeString("de-DE").toUpperCase()
    }
}

export function formatClockDate(now: Date, params: ClockWidgetParams): string {
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            ...zoneOption(params)
        }).formatToParts(now)
        const day = parts.find((part) => part.type === "day")?.value ?? "01"
        const month = parts.find((part) => part.type === "month")?.value ?? "01"
        const year = parts.find((part) => part.type === "year")?.value ?? "1970"
        if (params.dateStyle === "dmy-slash") return `${day}/${month}/${year}`
        if (params.dateStyle === "mdy-slash") return `${month}/${day}/${year}`
        if (params.dateStyle === "ymd-dash") return `${year}-${month}-${day}`
        return `${day}.${month}.${year}`
    } catch {
        return now.toLocaleDateString("de-DE")
    }
}
