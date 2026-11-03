"use client"

import {useEffect, useRef, useState} from "react"
import type {OverlayAsset} from "@streamcat/interfaces"
import {apiRequest} from "../../../lib/api"

export const ASSET_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
const MAX_FILE_SIZE = 100 * 1024 * 1024

export function useOverlayAssets(path: string, onError: (cause: unknown) => void) {
    const [assets, setAssets] = useState<OverlayAsset[]>([])
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [progress, setProgress] = useState("")
    const lifetime = useRef<AbortController | null>(null)
    const pending = useRef(false)

    useEffect(() => {
        const controller = new AbortController()
        lifetime.current = controller
        void apiRequest<OverlayAsset[]>(`${path}/assets`, {signal: controller.signal})
            .then((result) => {
                if (!controller.signal.aborted) setAssets(result)
            })
            .catch((cause) => {
                if (!controller.signal.aborted) onError(cause)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [path, onError])

    async function uploadFiles(files: File[]): Promise<OverlayAsset[]> {
        const controller = lifetime.current
        if (!controller || controller.signal.aborted || pending.current || !files.length) return []
        pending.current = true
        setUploading(true)
        const uploaded: OverlayAsset[] = []
        try {
            for (const [index, file] of files.entries()) {
                if (file.type && !ASSET_ACCEPT.split(",").includes(file.type))
                    throw new Error("Unterstützt werden PNG, JPG, WebP, GIF, MP4 und WebM.")
                if (file.size > MAX_FILE_SIZE) throw new Error("Eine Datei darf maximal 100 MiB groß sein.")
                setProgress(`Datei ${index + 1} / ${files.length} wird hochgeladen …`)
                const asset = await apiRequest<OverlayAsset>(`${path}/assets`, {
                    method: "POST",
                    headers: {
                        "Content-Type": file.type || "application/octet-stream",
                        "X-File-Name": encodeURIComponent(file.name)
                    },
                    body: file,
                    signal: controller.signal
                })
                if (controller.signal.aborted) return []
                uploaded.push(asset)
                setAssets((current) => [asset, ...current])
            }
        } catch (cause) {
            if (!controller.signal.aborted) onError(cause)
        } finally {
            pending.current = false
            if (!controller.signal.aborted) {
                setUploading(false)
                setProgress("")
            }
        }
        return uploaded
    }

    async function removeAsset(asset: OverlayAsset): Promise<void> {
        const controller = lifetime.current
        if (!controller || controller.signal.aborted || pending.current) return
        pending.current = true
        setDeletingId(asset.id)
        try {
            await apiRequest(
                `${path}/assets/${encodeURIComponent(asset.id)}`,
                {method: "DELETE", signal: controller.signal},
                "Das Medium konnte nicht gelöscht werden. Bitte versuche es erneut."
            )
            if (!controller.signal.aborted) setAssets((current) => current.filter((item) => item.id !== asset.id))
        } catch (cause) {
            if (!controller.signal.aborted) onError(cause)
        } finally {
            pending.current = false
            if (!controller.signal.aborted) setDeletingId(null)
        }
    }

    return {assets, uploading, deletingId, loading, progress, uploadFiles, removeAsset}
}
