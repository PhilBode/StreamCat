"use client"

import {useMemo, useState} from "react"
import type {OverlayAsset} from "@streamcat/interfaces"
import {ASSET_DRAG_TYPE} from "./use-overlay-assets"
import {Dialog, EditorTab, Select} from "../ui/dialog"
import {TrashIcon} from "../ui/icons"
import {widgetModule, WIDGET_CATALOG_TYPES, type AddableWidgetType} from "../widgets/registry"

const CATEGORY_OF: Record<AddableWidgetType, string> = {
    SPOTIFY_NOW_PLAYING: "Audio",
    TWITCH_CHAT: "Chat",
    WINDOW: "Fenster"
}

export function AddDialog({
    defaultTab,
    widgetCount,
    maxWidgets,
    assets,
    assetsLoading,
    uploading,
    deletingId,
    assetProgress,
    onAddWidget,
    onUploadAssets,
    onRemoveAsset,
    onAddAsset,
    onClose
}: {
    defaultTab: "widgets" | "assets"
    widgetCount: number
    maxWidgets: number
    assets: OverlayAsset[]
    assetsLoading: boolean
    uploading: boolean
    deletingId: string | null
    assetProgress: string
    onAddWidget: (type: AddableWidgetType, design: string) => void
    onUploadAssets: (files: File[]) => void
    onRemoveAsset: (asset: OverlayAsset) => void
    onAddAsset: (asset: OverlayAsset, asBackground: boolean, fit: "contain" | "cover") => void
    onClose: () => void
}) {
    const [tab, setTab] = useState<"widgets" | "assets">(defaultTab)
    const [search, setSearch] = useState("")
    const [widgetType, setWidgetType] = useState<AddableWidgetType | null>(null)
    const [design, setDesign] = useState("")
    const [assetId, setAssetId] = useState<string | null>(null)
    const [asBackground, setAsBackground] = useState(false)
    const [fit, setFit] = useState<"contain" | "cover">("contain")

    const widgets = useMemo(() => {
        const query = search.trim().toLowerCase()
        return WIDGET_CATALOG_TYPES.filter((type) =>
            query
                ? widgetModule(type).label.toLowerCase().includes(query) ||
                  CATEGORY_OF[type].toLowerCase().includes(query)
                : true
        )
    }, [search])

    const counts = useMemo(() => {
        const query = search.trim().toLowerCase()
        const matches = (type: AddableWidgetType) =>
            query
                ? widgetModule(type).label.toLowerCase().includes(query) ||
                  CATEGORY_OF[type].toLowerCase().includes(query)
                : true
        const result: Record<string, number> = {}
        for (const type of WIDGET_CATALOG_TYPES) {
            const category = CATEGORY_OF[type]
            result[category] = (result[category] ?? 0) + (matches(type) ? 1 : 0)
        }
        result["Alle"] = widgets.length
        return result
    }, [widgets, search])

    const widgetFull = widgetCount >= maxWidgets
    const selectedAsset = assets.find((asset) => asset.id === assetId) ?? null
    const selectedModule = widgetType ? widgetModule(widgetType) : null
    const designOptions = selectedModule
        ? Object.values(selectedModule.designs).map((item) => ({value: item.id, label: item.label}))
        : []
    const selectedDesign = design || selectedModule?.defaultDesign || ""

    function selectWidget(type: AddableWidgetType) {
        setWidgetType(type)
        setDesign(widgetModule(type).defaultDesign)
    }

    return (
        <Dialog
            title="Hinzufügen"
            subtitle={
                tab === "widgets"
                    ? "Widget wählen, Design festlegen, dann hinzufügen."
                    : "Dateien auswählen, Platzierung festlegen, dann hinzufügen."
            }
            onClose={onClose}
            width={1080}
            footer={
                <div className="overlay-add-footer">
                    <div className="overlay-add-footer-leading">
                        {tab === "widgets" && selectedModule && (
                            <Select
                                inline
                                label="Design"
                                value={selectedDesign}
                                options={designOptions}
                                onChange={setDesign}
                            />
                        )}
                    </div>
                    <div className="overlay-add-footer-actions">
                        <button type="button" className="button" onClick={onClose}>
                            Abbrechen
                        </button>
                        <button
                            type="button"
                            className="button primary"
                            disabled={
                                tab === "widgets"
                                    ? !widgetType || widgetFull
                                    : !selectedAsset || uploading || deletingId !== null
                            }
                            onClick={() => {
                                if (tab === "widgets" && widgetType) {
                                    onAddWidget(widgetType, selectedDesign)
                                    onClose()
                                }
                                if (tab === "assets" && selectedAsset) {
                                    onAddAsset(selectedAsset, asBackground, fit)
                                    onClose()
                                }
                            }}
                        >
                            Hinzufügen
                        </button>
                    </div>
                </div>
            }
        >
            <div className="overlay-add-tabs" role="tablist" aria-label="Hinzufügen">
                <EditorTab active={tab === "widgets"} onClick={() => setTab("widgets")}>
                    Widgets
                </EditorTab>
                <EditorTab active={tab === "assets"} onClick={() => setTab("assets")}>
                    Assets
                </EditorTab>
            </div>

            {tab === "widgets" && (
                <div className="overlay-add-widgets">
                    <div className="overlay-add-widgets-side">
                        <div className="overlay-field">
                            <input
                                className="overlay-field-input"
                                placeholder="Widgets suchen"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                aria-label="Widgets suchen"
                            />
                        </div>
                        <ul className="overlay-add-categories">
                            {[
                                "Alle",
                                ...Object.keys(CATEGORY_OF)
                                    .map((type) => CATEGORY_OF[type as AddableWidgetType])
                                    .filter((value, index, list) => list.indexOf(value) === index)
                            ].map((category) => (
                                <li key={category}>
                                    <span>{category}</span>
                                    <span className="overlay-add-count">{counts[category] ?? 0}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="overlay-add-total">
                            {widgetCount} / {maxWidgets} Widgets
                        </p>
                    </div>
                    <div className="overlay-add-widget-cards">
                        {widgets.map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={`overlay-add-widget-card ${widgetType === type ? "overlay-add-widget-card--active" : ""}`}
                                onClick={() => selectWidget(type)}
                            >
                                <span className="overlay-add-widget-glyph" aria-hidden="true">
                                    {type === "SPOTIFY_NOW_PLAYING" ? "♫" : type === "TWITCH_CHAT" ? "#" : "▣"}
                                </span>
                                <span className="overlay-add-widget-label">{widgetModule(type).label}</span>
                                <span className="overlay-add-widget-designs">
                                    {Object.keys(widgetModule(type).designs).length} Designs
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {tab === "assets" && (
                <div className="overlay-add-assets">
                    <div className="overlay-add-assets-main">
                        <div
                            className="overlay-add-dropzone"
                            onDragOver={(event) => {
                                if (event.dataTransfer.types.includes("Files")) event.preventDefault()
                            }}
                            onDrop={(event) => {
                                event.preventDefault()
                                if (!uploading) onUploadAssets(Array.from(event.dataTransfer.files))
                            }}
                        >
                            <span className="overlay-add-dropzone-glyph" aria-hidden="true">
                                ↑
                            </span>
                            <p className="overlay-add-dropzone-title">
                                {uploading ? "Upload läuft …" : "Datei hier ablegen"}
                            </p>
                            <p className="overlay-add-dropzone-hint">PNG · JPG · WEBP · GIF · MP4 · WEBM</p>
                            <label className="overlay-add-dropzone-button">
                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    aria-label="Dateien auswählen"
                                    onChange={(event) => {
                                        onUploadAssets(Array.from(event.target.files ?? []))
                                        event.target.value = ""
                                    }}
                                />
                                Dateien auswählen
                            </label>
                            {assetProgress && (
                                <p className="overlay-add-progress" role="status">
                                    {assetProgress}
                                </p>
                            )}
                        </div>
                        <div className="overlay-field">
                            <div className="overlay-add-library-head">
                                <span className="overlay-field-label">Bibliothek</span>
                                <span className="overlay-add-count">{assets.length}</span>
                            </div>
                            {assetsLoading && !assets.length && (
                                <p className="overlay-add-empty" role="status">
                                    Assets werden geladen …
                                </p>
                            )}
                            {!assetsLoading && !assets.length && (
                                <p className="overlay-add-empty">
                                    Noch keine Dateien. PNG · JPG · WEBP · GIF · MP4 · WEBM
                                </p>
                            )}
                            <div className="overlay-add-library">
                                {assets.map((asset) => (
                                    <button
                                        key={asset.id}
                                        type="button"
                                        draggable
                                        className={`overlay-add-asset ${assetId === asset.id ? "overlay-add-asset--active" : ""}`}
                                        title={asset.fileName}
                                        onDragStart={(event) => {
                                            event.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id)
                                            event.dataTransfer.effectAllowed = "copy"
                                        }}
                                        onClick={() => setAssetId(asset.id)}
                                    >
                                        {asset.kind === "IMAGE" ? (
                                            <img src={asset.url} alt="" draggable={false} />
                                        ) : (
                                            <video src={asset.url} muted preload="metadata" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="overlay-add-place">
                        <label className="overlay-check">
                            <input
                                type="checkbox"
                                className="overlay-check-input"
                                checked={!asBackground}
                                disabled={!selectedAsset}
                                onChange={(event) => event.target.checked && setAsBackground(false)}
                            />
                            <span className="overlay-check-box" aria-hidden="true" />
                            Als Widget
                        </label>
                        <label className="overlay-check">
                            <input
                                type="checkbox"
                                className="overlay-check-input"
                                checked={asBackground}
                                disabled={!selectedAsset}
                                onChange={(event) => event.target.checked && setAsBackground(true)}
                            />
                            <span className="overlay-check-box" aria-hidden="true" />
                            Als Hintergrund
                        </label>
                        {asBackground && selectedAsset && (
                            <p className="overlay-add-place-hint">Füllt die Szene · 1920 × 1080</p>
                        )}
                        <Select
                            label="Darstellung"
                            value={fit}
                            options={[
                                {value: "contain", label: "Contain"},
                                {value: "cover", label: "Cover"}
                            ]}
                            onChange={(value) => setFit(value as "contain" | "cover")}
                        />
                        {selectedAsset && (
                            <div className="overlay-add-selected">
                                <span className="overlay-field-label">Ausgewählte Datei</span>
                                <span className="overlay-add-selected-name">{selectedAsset.fileName}</span>
                                <span className="overlay-add-selected-meta">
                                    {selectedAsset.kind === "IMAGE" ? "PNG" : "MP4"} ·{" "}
                                    {(selectedAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                                </span>
                                <button
                                    type="button"
                                    className="overlay-add-asset-delete"
                                    disabled={deletingId !== null}
                                    onClick={() => {
                                        onRemoveAsset(selectedAsset)
                                        setAssetId(null)
                                    }}
                                >
                                    <TrashIcon />
                                    {deletingId === selectedAsset.id ? "Wird gelöscht …" : "Asset löschen"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Dialog>
    )
}
