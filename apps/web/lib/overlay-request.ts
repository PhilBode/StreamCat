import type {OverlayRequest} from "@streamcat/overlay-engine"
import {apiRequest} from "./api"

export const overlayRequest: OverlayRequest = <T>(path: string, options?: RequestInit, fallback?: string) =>
    apiRequest<T>(path, options, fallback)
