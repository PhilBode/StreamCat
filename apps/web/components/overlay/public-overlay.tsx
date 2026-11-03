"use client"

import {useEffect, useState} from "react"
import type {OverlaySnapshot} from "@streamcat/interfaces"
import {OverlayRenderer} from "./renderer"

export function PublicOverlay() {
    const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null)
    const [status, setStatus] = useState("Overlay wird geladen …")
    const [viewport, setViewport] = useState({width: 0, height: 0})

    useEffect(() => {
        const resize = () => setViewport({width: window.innerWidth, height: window.innerHeight})
        resize()
        window.addEventListener("resize", resize)
        return () => window.removeEventListener("resize", resize)
    }, [])

    useEffect(() => {
        let controller: AbortController | undefined
        let timer: ReturnType<typeof setTimeout> | undefined
        let generation = 0
        async function start() {
            const current = ++generation
            controller?.abort()
            clearTimeout(timer)
            controller = new AbortController()
            const signal = controller.signal
            const token = window.location.hash.slice(1)
            // Give React the same initial HTML on server and client; parse the fragment only after mount.
            await Promise.resolve()
            if (signal.aborted || current !== generation) return
            setSnapshot(null)
            if (!token || !/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
                setStatus("Overlay nicht verfügbar. Bitte einen gültigen OBS-Link verwenden.")
                return
            }
            setStatus("Overlay wird geladen …")
            async function poll() {
                try {
                    const response = await fetch("/api/backend/overlays/live", {
                        headers: {Authorization: `Bearer ${token}`},
                        credentials: "omit",
                        cache: "no-store",
                        signal
                    })
                    if (signal.aborted || current !== generation) return
                    if (!response.ok) {
                        setSnapshot(null)
                        setStatus("Overlay momentan nicht verfügbar.")
                        if (response.status === 401 || response.status === 404) return
                    } else {
                        const result: OverlaySnapshot = await response.json()
                        if (signal.aborted || current !== generation) return
                        setSnapshot(result)
                    }
                } catch {
                    if (signal.aborted || current !== generation) return
                    setSnapshot(null)
                    setStatus("Overlay momentan nicht verfügbar.")
                }
                if (!signal.aborted && current === generation) timer = setTimeout(() => void poll(), 3000)
            }
            void poll()
        }
        const onHashChange = () => void start()
        window.addEventListener("hashchange", onHashChange)
        void start()
        return () => {
            generation++
            controller?.abort()
            clearTimeout(timer)
            window.removeEventListener("hashchange", onHashChange)
        }
    }, [])

    const scale = snapshot
        ? Math.min(viewport.width / snapshot.overlay.layout.width, viewport.height / snapshot.overlay.layout.height)
        : 0

    return (
        <div className="obs-overlay">
            {snapshot ? (
                <div className="obs-scaled-scene" style={{zoom: scale || 1, visibility: scale ? "visible" : "hidden"}}>
                    <OverlayRenderer
                        layout={snapshot.overlay.layout}
                        playback={snapshot.playback}
                        chat={snapshot.chat}
                        assets={snapshot.assets}
                        interactive
                    />
                </div>
            ) : (
                <span className="obs-unavailable" role="status">
                    {status}
                </span>
            )}
        </div>
    )
}
