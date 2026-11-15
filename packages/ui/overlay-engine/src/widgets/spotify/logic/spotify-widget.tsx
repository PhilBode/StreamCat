"use client"

import {useEffect, useRef, useState, type SyntheticEvent} from "react"
import type {EditorWidget, OverlayPlayback} from "@streamcat/interfaces"
import {AudioSpectrum} from "./audio-spectrum"
import {SimulatedSpectrum} from "./simulated-spectrum"

function artworkColor(image: HTMLImageElement): string {
    const canvas = document.createElement("canvas")
    // A small sample keeps the original average-cover color without scanning a full-size album.
    canvas.width = canvas.height = 32
    const context = canvas.getContext("2d", {willReadFrequently: true})
    if (!context) return "#ffffff"
    context.drawImage(image, 0, 0, 32, 32)
    try {
        const pixels = context.getImageData(0, 0, 32, 32).data
        const average = [0, 0, 0]
        for (let index = 0; index < pixels.length; index += 4) {
            average[0] += pixels[index]
            average[1] += pixels[index + 1]
            average[2] += pixels[index + 2]
        }
        const rgb = average.map((value) => value / (pixels.length / 4))
        // Keep dark covers visible, as in the original spectralizer.
        const lightness = (Math.max(...rgb) + Math.min(...rgb)) / 2
        const lift = Math.max(0, 0.45 * 255 - lightness)
        return `rgb(${rgb.map((value) => Math.round(Math.min(255, value + lift))).join(" ")})`
    } catch {
        console.warn("[Overlay] Album color unavailable; using white spectrum")
        return "#ffffff"
    }
}

function PlaybackProgress({playback}: {playback: OverlayPlayback}) {
    const fill = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const started = performance.now()
        function update() {
            // Cached snapshots carry their sample time so repeated polling cannot rewind the bar.
            const elapsed =
                playback.status === "playing"
                    ? playback.sampledAt
                        ? Math.max(0, Date.now() - playback.sampledAt)
                        : performance.now() - started
                    : 0
            const progress = (playback.progressMs ?? 0) + elapsed
            const duration = playback.durationMs ?? 0
            if (fill.current)
                fill.current.style.width = `${duration > 0 ? Math.max(0, Math.min(100, (progress / duration) * 100)) : 0}%`
        }
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [playback])
    return (
        <div className="overlay-progress" hidden={playback.status !== "playing" || !playback.durationMs}>
            <div ref={fill} className="overlay-progress-fill" />
        </div>
    )
}

export function SpotifyWidget({
    widget,
    playback,
    audioEnabled
}: {
    widget: Extract<EditorWidget, {type: "SPOTIFY_NOW_PLAYING"}>
    playback: OverlayPlayback
    audioEnabled: boolean
}) {
    const [dominantColor, setDominantColor] = useState("#ffffff")
    const [scrolling, setScrolling] = useState(false)
    const title = useRef<HTMLSpanElement>(null)
    const hasTrack = playback.status === "playing" || playback.status === "paused"
    function albumLoaded(event: SyntheticEvent<HTMLImageElement>) {
        setDominantColor(artworkColor(event.currentTarget))
    }

    useEffect(() => {
        const text = title.current
        const viewport = text?.closest(".overlay-title-viewport")
        if (!text || !viewport) return
        const observer = new ResizeObserver(() => setScrolling(hasTrack && text.offsetWidth > viewport.clientWidth))
        observer.observe(text)
        observer.observe(viewport)
        return () => observer.disconnect()
    }, [hasTrack])

    if (!hasTrack) return null

    return (
        <div className="overlay-spotify">
            {playback.albumUrl && (
                <img
                    key={playback.albumUrl}
                    className="overlay-album"
                    src={playback.albumUrl}
                    crossOrigin="anonymous"
                    alt=""
                    draggable={false}
                    referrerPolicy="no-referrer"
                    onLoad={albumLoaded}
                />
            )}
            <div className="overlay-track-info">
                {widget.params.spectrumMode === "simulated" ? (
                    widget.params.spectralizer === true && (
                        <SimulatedSpectrum playing={playback.status === "playing"} color={dominantColor} />
                    )
                ) : (
                    <AudioSpectrum
                        enabled={audioEnabled && widget.params.spectralizer === true}
                        deviceName={widget.params.audioDeviceName ?? ""}
                        color={dominantColor}
                    />
                )}
                <div className="overlay-title-viewport">
                    <span className={scrolling ? "overlay-track-title scrolling" : "overlay-track-title"}>
                        <span className="overlay-title-text" ref={title}>
                            {playback.name || playback.text}
                        </span>
                    </span>
                </div>
                <span className="overlay-track-artist">{playback.artist ?? ""}</span>
                <PlaybackProgress playback={playback} />
            </div>
        </div>
    )
}
