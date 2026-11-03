"use client"

import {useEffect, useRef} from "react"

// The original spectralizer reads a local audio input, not Spotify's Web API.
export function AudioSpectrum({enabled, deviceName, color}: {enabled: boolean; deviceName: string; color: string}) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const barColor = useRef(color)
    useEffect(() => {
        barColor.current = color
    }, [color])

    useEffect(() => {
        const element = canvas.current
        const drawing = element?.getContext("2d")
        if (!element || !drawing || !enabled) return
        let disposed = false
        let stream: MediaStream | undefined
        let context: AudioContext | undefined
        let observer: ResizeObserver | undefined
        let frame = 0
        let resizeFrame = 0
        let onResize: (() => void) | undefined

        async function start() {
            try {
                if (!navigator.mediaDevices) throw new Error("Audio input requires HTTPS or localhost")
                // Request access first: browsers hide device labels until permission is granted.
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        channelCount: 2,
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                })
                if (disposed) {
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }
                if (deviceName) {
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    if (disposed) return
                    const device = devices.find(
                        (item) =>
                            item.kind === "audioinput" && item.label.toLowerCase().includes(deviceName.toLowerCase())
                    )
                    if (!device) console.warn("[Overlay] Requested audio input not found; using default input")
                    else {
                        stream.getTracks().forEach((track) => track.stop())
                        stream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                deviceId: {exact: device.deviceId},
                                channelCount: 2,
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false
                            }
                        })
                    }
                }
                if (disposed) {
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }
                context = new AudioContext()
                const analyser = context.createAnalyser()
                analyser.smoothingTimeConstant = 0.85
                context.createMediaStreamSource(stream).connect(analyser)
                void context.resume().catch(() => console.warn("[Overlay] Audio context could not resume"))
                let width = 0
                let height = 0
                let bins = new Uint8Array(32)
                function resize() {
                    // Use logical pixels so a scaled editor preview keeps the same bar density as OBS.
                    width = element!.clientWidth
                    height = element!.clientHeight
                    // Render enough pixels for larger OBS sources while retaining logical bar density.
                    const rect = element!.getBoundingClientRect()
                    const ratio = window.devicePixelRatio || 1
                    element!.width = Math.ceil(Math.max(width, rect.width) * ratio)
                    element!.height = Math.ceil(Math.max(height, rect.height) * ratio)
                    drawing!.setTransform(
                        width ? element!.width / width : 1,
                        0,
                        0,
                        height ? element!.height / height : 1,
                        0,
                        0
                    )
                    analyser.fftSize = Math.max(
                        64,
                        Math.min(32768, 2 ** Math.floor(Math.log2(Math.max(32, width / 5))) * 2)
                    )
                    bins = new Uint8Array(analyser.frequencyBinCount)
                }
                observer = new ResizeObserver(resize)
                observer.observe(element!)
                // The logical box can stay unchanged when the scene's CSS zoom changes.
                onResize = () => {
                    cancelAnimationFrame(resizeFrame)
                    resizeFrame = requestAnimationFrame(resize)
                }
                window.addEventListener("resize", onResize)
                resize()
                function draw() {
                    if (disposed) return
                    analyser.getByteFrequencyData(bins)
                    drawing!.clearRect(0, 0, width, height)
                    drawing!.fillStyle = barColor.current
                    const barWidth = width / bins.length
                    bins.forEach((value, index) => {
                        const barHeight = (value / 255) * height
                        drawing!.fillRect(index * barWidth, height - barHeight, Math.max(1, barWidth - 1), barHeight)
                    })
                    frame = requestAnimationFrame(draw)
                }
                draw()
            } catch (error) {
                stream?.getTracks().forEach((track) => track.stop())
                if (context && context.state !== "closed") void context.close().catch(() => {})
                if (!disposed)
                    console.warn(
                        `[Overlay] Audio spectrum unavailable: ${error instanceof Error ? error.name : "unknown error"}`
                    )
            }
        }
        void start()
        return () => {
            disposed = true
            cancelAnimationFrame(frame)
            cancelAnimationFrame(resizeFrame)
            if (onResize) window.removeEventListener("resize", onResize)
            observer?.disconnect()
            stream?.getTracks().forEach((track) => track.stop())
            if (context && context.state !== "closed") void context.close().catch(() => {})
            drawing.clearRect(0, 0, element.width, element.height)
        }
    }, [enabled, deviceName])

    return <canvas ref={canvas} className="overlay-spectrum" aria-hidden="true" />
}
