import {useEffect, useState} from "react"

export function useClock() {
    const [now, setNow] = useState<Date | null>(null)
    useEffect(() => {
        const tick = () => setNow(new Date())
        tick()
        const timer = setInterval(tick, 1000)
        return () => clearInterval(timer)
    }, [])
    return now
}
