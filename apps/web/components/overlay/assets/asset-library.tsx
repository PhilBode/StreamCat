/* eslint-disable @next/next/no-img-element -- Authenticated uploads and animated GIFs must use their original media URLs. */
"use client"

import {useRef, useState} from "react"
import type {OverlayAsset} from "@streamcat/interfaces"
import {ASSET_ACCEPT} from "./use-overlay-assets"
import {Skeleton} from "../../ui/skeleton"

export const ASSET_DRAG_TYPE = "application/x-streamcat-asset"

export function AssetLibrary({
    assets,
    loading,
    uploading,
    deletingId,
    progress,
    onUpload,
    onAdd,
    onRemove,
    full
}: {
    assets: OverlayAsset[]
    loading: boolean
    uploading: boolean
    deletingId: string | null
    progress: string
    full: boolean
    onUpload: (files: File[]) => void
    onAdd: (asset: OverlayAsset) => void
    onRemove: (asset: OverlayAsset) => void
}) {
    const input = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const busy = uploading || deletingId !== null
    return (
        <section className="overlay-assets">
            <h2>Bilder & Videos</h2>
            <div
                className={`overlay-asset-dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(event) => {
                    if (event.dataTransfer.types.includes("Files")) {
                        event.preventDefault()
                        setDragging(true)
                    }
                }}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
                }}
                onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    if (!busy) onUpload(Array.from(event.dataTransfer.files))
                }}
            >
                <button className="button" disabled={busy} onClick={() => input.current?.click()}>
                    {uploading ? "Upload läuft …" : "Dateien hochladen"}
                </button>
                <p className="muted overlay-hint">Hier ablegen, danach auswählen oder direkt in die Vorschau ziehen.</p>
                <input
                    ref={input}
                    type="file"
                    accept={ASSET_ACCEPT}
                    multiple
                    hidden
                    aria-label="Bild oder Video hochladen"
                    onChange={(event) => {
                        onUpload(Array.from(event.target.files ?? []))
                        event.target.value = ""
                    }}
                />
            </div>
            <p className="muted overlay-hint" role="status">
                {progress || "PNG, JPG, WebP, GIF, MP4, WebM · max. 100 MiB / Datei · 500 MiB / Server"}
            </p>
            <div
                className="overlay-asset-grid"
                role={loading ? "status" : undefined}
                aria-label={loading ? "Assets werden geladen" : undefined}
            >
                {loading &&
                    !assets.length &&
                    [0, 1, 2, 3].map((asset) => (
                        <div className="overlay-asset-item" key={asset} aria-hidden="true">
                            <Skeleton className="asset-skeleton-thumbnail" />
                            <Skeleton className="skeleton-text" />
                        </div>
                    ))}
                {assets.map((asset) => (
                    <div key={asset.id} className="overlay-asset-item">
                        <button
                            className="overlay-asset"
                            disabled={full || busy}
                            draggable={!full && !busy}
                            onDragStart={(event) => {
                                event.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id)
                                event.dataTransfer.effectAllowed = "copy"
                            }}
                            onClick={() => onAdd(asset)}
                            title={`${asset.fileName} zur Szene hinzufügen`}
                        >
                            {asset.kind === "IMAGE" ? (
                                <img src={asset.url} alt="" draggable={false} />
                            ) : (
                                <video src={asset.url} muted preload="metadata" />
                            )}
                            <span>
                                {asset.kind === "VIDEO" ? "▶ " : ""}
                                {asset.fileName}
                            </span>
                        </button>
                        <button
                            className="button overlay-asset-delete"
                            disabled={busy}
                            aria-label={`${asset.fileName} löschen`}
                            onClick={() => onRemove(asset)}
                        >
                            {deletingId === asset.id ? "Wird gelöscht …" : "Löschen"}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    )
}
