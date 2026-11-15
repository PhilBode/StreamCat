"use client"

import {useEffect, useRef} from "react"

const BANDS = Array.from({length: 32}, (_, index) => index / 31)
const INITIAL_LEVELS = BANDS.map((frequency) => 0.12 + 0.3 * (1 - frequency))

// Interpolated noise gives neighbouring bands shared movement without a short repeating loop.
function noise(time: number, seed: number) {
    const step = Math.floor(time)
    const fraction = time - step
    const blend = fraction * fraction * (3 - 2 * fraction)
    function sample(position: number) {
        const value = Math.sin(position * 127.1 + seed * 311.7) * 43758.5453
        return value - Math.floor(value)
    }
    return sample(step) * (1 - blend) + sample(step + 1) * blend
}

// Decorative spectrum: the rhythm is generated locally, never analysed from Spotify or a microphone.
export function SimulatedSpectrum({playing, color}: {playing: boolean; color: string}) {
    const container = useRef<HTMLDivElement>(null)
    const elapsed = useRef(0)
    const levels = useRef(BANDS.map(() => 0))

    useEffect(() => {
        const element = container.current
        if (!element) return
        const bars = element.querySelectorAll("i")
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
        let frame = 0
        let previousTime: number | undefined

        function draw(now: number) {
            const delta = previousTime === undefined ? 0 : Math.min((now - previousTime) / 1000, 0.05)
            previousTime = now
            if (playing) elapsed.current += delta
            const time = elapsed.current
            const beat = time * 1.85
            const kick = Math.exp(-(beat % 1) * 8) * (0.65 + 0.35 * noise(time * 0.6, 1))
            const snare = Math.exp(-((beat + 0.5) % 1) * 16)
            const hiHat = Math.exp(-((beat * 2) % 1) * 18)
            const phrase = 0.6 + 0.4 * noise(time * 0.18, 2)
            const midPeak = 0.25 + 0.35 * noise(time * 0.4, 3)

            let settling = false
            bars.forEach((bar, index) => {
                const frequency = BANDS[index]
                const bass = Math.exp(-frequency * 7) * kick
                const mids = Math.exp(-(((frequency - midPeak) / 0.22) ** 2)) * (0.4 + 0.6 * noise(time * 3, 4))
                const treble = frequency * (0.4 * snare + 0.25 * hiHat)
                const texture = 0.5 + 0.5 * noise(time * 8, index + 10)
                const target = playing ? Math.min(0.96, 0.03 + phrase * texture * (bass + 0.85 * mids + treble)) : 0
                // Fast attack, slower release; timing stays consistent on different refresh rates.
                const response = target > levels.current[index] ? 0.025 : 0.18
                levels.current[index] += (target - levels.current[index]) * (1 - Math.exp(-delta / response))
                if (!playing && levels.current[index] < 0.001) levels.current[index] = 0
                if (levels.current[index] > 0) settling = true
                bar.style.transform = `scaleY(${levels.current[index]})`
            })
            // Finish the release after pausing, then stop scheduling frames once every bar is silent.
            if (playing || settling) frame = requestAnimationFrame(draw)
        }

        function updateMotion() {
            cancelAnimationFrame(frame)
            previousTime = undefined
            if (reducedMotion.matches) {
                bars.forEach((bar, index) => {
                    levels.current[index] = playing ? INITIAL_LEVELS[index] : 0
                    bar.style.transform = `scaleY(${levels.current[index]})`
                })
            } else frame = requestAnimationFrame(draw)
        }
        updateMotion()
        reducedMotion.addEventListener("change", updateMotion)
        return () => {
            cancelAnimationFrame(frame)
            reducedMotion.removeEventListener("change", updateMotion)
        }
    }, [playing])

    return (
        <div ref={container} className="overlay-spectrum overlay-spectrum-simulated" style={{color}} aria-hidden="true">
            {BANDS.map((_, index) => (
                <i key={index} style={{transform: "scaleY(0)"}} />
            ))}
        </div>
    )
}
