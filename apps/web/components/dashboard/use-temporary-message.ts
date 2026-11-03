"use client"

import {useEffect, useState} from "react"

export function useTemporaryMessage() {
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!message) return
        const timeout = setTimeout(() => setMessage(null), 6000)
        return () => clearTimeout(timeout)
    }, [message])

    return [message, setMessage] as const
}
