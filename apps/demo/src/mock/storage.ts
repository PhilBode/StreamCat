import type {GuildOverlay} from "@streamcat/interfaces"
import {seedScenes} from "./seed"

const STORAGE_KEY = "streamcat-demo-scenes-v1"

export function loadScenes(): GuildOverlay[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return seedScenes()
        const parsed = JSON.parse(stored) as unknown
        if (!Array.isArray(parsed) || parsed.length === 0) return seedScenes()
        return parsed as GuildOverlay[]
    } catch {
        return seedScenes()
    }
}

export function persistScenes(scenes: GuildOverlay[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
    } catch {
        console.warn("[Demo] Demo-Daten konnten nicht im Browser gespeichert werden.")
    }
}

export function clearDemoScenes(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // Storage can be unavailable in private mode.
    }
}
