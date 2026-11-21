import {useEffect, useState} from "react"

export function useCountdown(target: string) {
    const [now, setNow] = useState<number | null>(null)
    useEffect(() => {
        const tick = () => setNow(Date.now())
        tick()
        const timer = setInterval(tick, 1000)
        return () => clearInterval(timer)
    }, [])
    if (!target || now === null) return null
    const targetMs = Date.parse(target)
    if (!Number.isFinite(targetMs)) return null
    return Math.max(0, targetMs - now)
}
