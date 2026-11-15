"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import type {GuildOverlay, OverlayLink, OverlayScene} from "@streamcat/interfaces"
import {isAuthError, postJson, type OverlayRequest} from "../api/transport"
import {useLayoutHistory} from "../history/use-layout-history"

function rememberScene(id: string) {
    const url = new URL(window.location.href)
    url.searchParams.set("scene", id)
    window.history.replaceState(null, "", url.pathname + url.search)
}

export function useOverlayScenes(basePath: string, request: OverlayRequest) {
    const [overlay, setOverlay] = useState<GuildOverlay | null>(null)
    const [scenes, setScenes] = useState<GuildOverlay[]>([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<"create" | "save" | "rotate" | "rename" | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [links, setLinks] = useState<Record<string, string>>({})
    const [notice, setNotice] = useState<string | null>(null)
    const [pendingScene, setPendingScene] = useState<string | null>(null)
    const clearNotice = useCallback(() => setNotice(null), [])
    const history = useLayoutHistory(!!overlay && !busy, clearNotice)
    const {layout, reset: resetLayout, replace: replaceLayout} = history
    const lifetime = useRef<AbortController | null>(null)
    const path = basePath
    const dirty = !!layout && !!overlay && JSON.stringify(layout) !== JSON.stringify(overlay.layout)

    const reportError = useCallback(
        (cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Das Overlay ist momentan nicht erreichbar.")
            if (isAuthError(cause)) {
                setOverlay(null)
                resetLayout(null)
                setLinks({})
            }
        },
        [resetLayout]
    )

    useEffect(() => {
        if (!dirty) return
        const warn = (event: BeforeUnloadEvent) => event.preventDefault()
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [dirty])

    useEffect(() => {
        const controller = new AbortController()
        lifetime.current = controller
        void request<GuildOverlay[]>(`${path}/scenes`, {signal: controller.signal})
            .then((result) => {
                if (controller.signal.aborted) return
                const requested = new URLSearchParams(window.location.search).get("scene")
                const selected = result.find((scene) => scene.id === requested) ?? result[0] ?? null
                setScenes(result)
                setOverlay(selected)
                resetLayout(selected?.layout ?? null)
            })
            .catch((cause) => {
                if (!controller.signal.aborted) reportError(cause)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [path, request, reportError, resetLayout])

    async function run(
        action: "create" | "save" | "rotate" | "rename",
        operation: (signal: AbortSignal) => Promise<void>
    ) {
        const controller = lifetime.current
        if (!controller || controller.signal.aborted || busy) return false
        setBusy(action)
        setError(null)
        setNotice(null)
        try {
            await operation(controller.signal)
            return !controller.signal.aborted
        } catch (cause) {
            if (!controller.signal.aborted) reportError(cause)
            return false
        } finally {
            if (!controller.signal.aborted) setBusy(null)
        }
    }

    function selectScene(id: string) {
        if (busy || id === overlay?.id) return
        if (dirty) {
            setPendingScene(id)
            return
        }
        openScene(id)
    }

    function openScene(id: string) {
        const selected = scenes.find((scene) => scene.id === id)
        if (!selected) return
        setOverlay(selected)
        resetLayout(selected.layout)
        rememberScene(selected.id)
        setPendingScene(null)
        setNotice(null)
        setError(null)
    }

    function createScene(name: string, scene: OverlayScene) {
        return run("create", async (signal) => {
            const result = await request<{overlay: GuildOverlay; browserSourceUrl: string}>(
                `${path}/scenes`,
                postJson({name, scene}, signal)
            )
            if (signal.aborted) return
            setOverlay(result.overlay)
            resetLayout(result.overlay.layout)
            rememberScene(result.overlay.id)
            setScenes((current) => [...current, result.overlay])
            setLinks((current) => ({...current, [result.overlay.id]: result.browserSourceUrl}))
        })
    }

    function saveScene() {
        if (!layout || !overlay) return Promise.resolve(false)
        const revision = history.getRevision()
        return run("save", async (signal) => {
            const result = await request<GuildOverlay>(
                `${path}/scenes/${encodeURIComponent(overlay.id)}/layout`,
                postJson(layout, signal)
            )
            if (signal.aborted) return
            setOverlay(result)
            replaceLayout((current) => (JSON.stringify(current) === JSON.stringify(layout) ? result.layout : current))
            setScenes((current) => current.map((item) => (item.id === result.id ? result : item)))
            setNotice(
                history.getRevision() === revision
                    ? "Overlay gespeichert. Deine Browser-Quelle lädt das Layout automatisch."
                    : "Overlay gespeichert. Deine neueren Änderungen sind noch nicht gespeichert."
            )
        }).then((saved) => saved && history.getRevision() === revision)
    }

    function rotateScene() {
        if (!overlay) return Promise.resolve(false)
        return run("rotate", async (signal) => {
            const result = await request<OverlayLink>(
                `${path}/scenes/${encodeURIComponent(overlay.id)}/rotate`,
                postJson({}, signal)
            )
            if (!signal.aborted) setLinks((current) => ({...current, [overlay.id]: result.browserSourceUrl}))
        })
    }

    function renameScene(name: string) {
        if (!overlay) return Promise.resolve(false)
        return run("rename", async (signal) => {
            const result = await request<GuildOverlay>(
                `${path}/scenes/${encodeURIComponent(overlay.id)}/name`,
                postJson({name}, signal)
            )
            if (signal.aborted) return
            setOverlay(result)
            setScenes((current) => current.map((item) => (item.id === result.id ? result : item)))
        })
    }

    return {
        overlay,
        scenes,
        loading,
        busy,
        error,
        setError,
        links,
        notice,
        setNotice,
        pendingScene,
        setPendingScene,
        history,
        dirty,
        path,
        reportError,
        selectScene,
        openScene,
        createScene,
        saveScene,
        rotateScene,
        renameScene
    }
}
