"use client"

import {useEffect, useState} from "react"
import type {OverlaySnapshot} from "@streamcat/interfaces"
import {OverlayRenderer} from "./renderer"

const DEFAULT_SNAPSHOT_URL = "/api/backend/overlays/live"
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/

export type OverlayPlayerProps = {
    snapshotUrl?: string
    pollIntervalMs?: number
    loadingLabel?: string
    unavailableLabel?: string
    invalidLinkLabel?: string
}

export function OverlayPlayer({
    snapshotUrl = DEFAULT_SNAPSHOT_URL,
    pollIntervalMs = 3000,
    loadingLabel = "Overlay wird geladen …",
    unavailableLabel = "Overlay momentan nicht verfügbar.",
    invalidLinkLabel = "Overlay nicht verfügbar. Bitte einen gültigen OBS-Link verwenden."
}: OverlayPlayerProps) {
    const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null)
    const [status, setStatus] = useState(loadingLabel)
    const [viewport, setViewport] = useState({width: 0, height: 0})
    const interval = Math.max(1000, pollIntervalMs)

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
            if (!token || !TOKEN_PATTERN.test(token)) {
                setStatus(invalidLinkLabel)
                return
            }
            setStatus(loadingLabel)
            async function poll() {
                try {
                    const response = await fetch(snapshotUrl, {
                        headers: {Authorization: `Bearer ${token}`},
                        credentials: "omit",
                        cache: "no-store",
                        signal
                    })
                    if (signal.aborted || current !== generation) return
                    if (!response.ok) {
                        setSnapshot(null)
                        setStatus(unavailableLabel)
                        if (response.status === 401 || response.status === 404) return
                    } else {
                        const result: OverlaySnapshot = await response.json()
                        if (signal.aborted || current !== generation) return
                        setSnapshot(result)
                    }
                } catch {
                    if (signal.aborted || current !== generation) return
                    setSnapshot(null)
                    setStatus(unavailableLabel)
                }
                if (!signal.aborted && current === generation) timer = setTimeout(() => void poll(), interval)
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
    }, [snapshotUrl, interval, loadingLabel, unavailableLabel, invalidLinkLabel])

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
