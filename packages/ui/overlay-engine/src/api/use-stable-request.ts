"use client"

import {useCallback, useRef} from "react"
import type {OverlayRequest} from "./transport"

export function useStableRequest(request: OverlayRequest): OverlayRequest {
    const current = useRef(request)
    current.current = request
    return useCallback(function stableRequest<T>(path: string, options?: RequestInit, fallback?: string) {
        return current.current<T>(path, options, fallback)
    }, [])
}
