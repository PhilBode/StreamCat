export function formatCountdown(remainingMs: number, format: "dhms" | "hms" | "ms"): string {
    const totalSeconds = Math.floor(remainingMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (value: number) => String(value).padStart(2, "0")
    if (format === "ms") return `${pad(minutes)}:${pad(seconds)}`
    if (format === "hms") return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
