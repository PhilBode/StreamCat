import type {GuildOverlay, OverlayAsset, OverlayChat, OverlayLayout, OverlayScene} from "@streamcat/interfaces"
import type {OverlayRequest} from "@streamcat/overlay-engine"
import {DEMO_ASSETS, DEMO_BASE_PATH, createDemoOverlay, demoPlayback} from "./seed"
import {loadScenes, persistScenes} from "./storage"

const LATENCY_MS = 120
let scenes = loadScenes()
let sessionAssets: OverlayAsset[] = []

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function jsonBody<T>(body: BodyInit | null | undefined): T {
    if (typeof body !== "string") throw new Error("Demo-Anfrage enthält keine JSON-Daten.")
    return JSON.parse(body) as T
}

function assertActive(signal?: AbortSignal | null): void {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
}

async function wait(signal?: AbortSignal | null): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
    assertActive(signal)
}

function chatPreview(): OverlayChat {
    let previewUrl: string | null = null
    try {
        previewUrl = new URL("demo-chat.html", document.baseURI).toString()
    } catch {
        previewUrl = "./demo-chat.html"
    }
    return {channel: "streamcatdemo", url: null, previewUrl}
}

function assetUpload(body: BodyInit | null | undefined): OverlayAsset {
    if (!(body instanceof File)) throw new Error("Demo-Upload konnte die Datei nicht lesen.")
    if (!body.type.startsWith("image/") && !body.type.startsWith("video/")) {
        throw new Error("Die Demo unterstützt nur Bilder und Videos.")
    }
    const asset: OverlayAsset = {
        id: `demo-asset-${crypto.randomUUID()}`,
        kind: body.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        fileName: body.name,
        mimeType: body.type,
        sizeBytes: body.size,
        url: URL.createObjectURL(body)
    }
    sessionAssets = [asset, ...sessionAssets]
    return asset
}

function persist(next: GuildOverlay[]): void {
    scenes = next
    persistScenes(next)
}

export const demoRequest: OverlayRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    await wait(options.signal)
    const signal = options.signal
    assertActive(signal)
    const suffix = path.startsWith(DEMO_BASE_PATH) ? path.slice(DEMO_BASE_PATH.length) || "/" : path
    const parts = suffix.split("/").filter(Boolean)
    const method = (options.method ?? "GET").toUpperCase()

    if (method === "GET" && parts.length === 1 && parts[0] === "scenes") {
        return clone(scenes) as T
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "scene-links") {
        return {} as T
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "assets") {
        return clone([...DEMO_ASSETS, ...sessionAssets]) as T
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "preview") {
        return clone({playback: demoPlayback(), chat: chatPreview()}) as T
    }

    if (method === "POST" && parts.length === 1 && parts[0] === "scenes") {
        const body = jsonBody<{name?: unknown; scene?: unknown}>(options.body)
        if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Bitte gib der Szene einen Namen.")
        const scene = body.scene as OverlayScene
        const overlay = createDemoOverlay(scene, body.name.trim(), `demo-${crypto.randomUUID()}`)
        persist([...scenes, overlay])
        return clone({overlay, browserSourceUrl: ""}) as T
    }

    if (method === "POST" && parts.length === 3 && parts[0] === "scenes" && parts[2] === "layout") {
        const id = decodeURIComponent(parts[1])
        const layout = jsonBody<OverlayLayout>(options.body)
        const existing = scenes.find((scene) => scene.id === id)
        if (!existing) throw new Error("Diese Demo-Szene wurde nicht gefunden.")
        const updated: GuildOverlay = {...existing, layout}
        persist(scenes.map((scene) => (scene.id === id ? updated : scene)))
        return clone(updated) as T
    }

    if (method === "POST" && parts.length === 3 && parts[0] === "scenes" && parts[2] === "rotate") {
        return {browserSourceUrl: ""} as T
    }

    if (method === "POST" && parts.length === 3 && parts[0] === "scenes" && parts[2] === "name") {
        const id = decodeURIComponent(parts[1])
        const body = jsonBody<{name?: unknown}>(options.body)
        if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Bitte gib der Szene einen Namen.")
        const existing = scenes.find((scene) => scene.id === id)
        if (!existing) throw new Error("Diese Demo-Szene wurde nicht gefunden.")
        const updated: GuildOverlay = {...existing, name: body.name.trim()}
        persist(scenes.map((scene) => (scene.id === id ? updated : scene)))
        return clone(updated) as T
    }

    if (method === "DELETE" && parts.length === 2 && parts[0] === "scenes") {
        const id = decodeURIComponent(parts[1])
        persist(scenes.filter((scene) => scene.id !== id))
        return {success: true} as T
    }

    if (method === "POST" && parts.length === 1 && parts[0] === "assets") {
        return clone(assetUpload(options.body)) as T
    }

    if (method === "DELETE" && parts.length === 2 && parts[0] === "assets") {
        const id = decodeURIComponent(parts[1])
        if (!sessionAssets.some((asset) => asset.id === id))
            throw new Error("Demo-Assets bleiben erhalten. Lade eigene Dateien hoch, um sie zu löschen.")
        sessionAssets = sessionAssets.filter((asset) => asset.id !== id)
        return {success: true} as T
    }

    throw new Error(`Diese Aktion ist in der Demo nicht verfügbar. (${method} ${suffix})`)
}
