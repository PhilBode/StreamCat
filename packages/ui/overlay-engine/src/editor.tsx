"use client"

import {useEffect, useState, type ElementType, type ReactNode} from "react"
import {
    MAX_OVERLAY_WIDGETS,
    isMediaWidget,
    type EditorWidget,
    type OverlayChat,
    type OverlayPlayback,
    type OverlayAsset,
    type OverlayLayout,
    type OverlayFont,
    type OverlayScene,
    type OverlayTheme
} from "@streamcat/interfaces"
import {isAuthError, type OverlayRequest} from "./api/transport"
import {useStableRequest} from "./api/use-stable-request"
import {OverlayCanvas, type OverlaySelection} from "./canvas"
import {EMPTY_PLAYBACK} from "./renderer"
import {WidgetSettings} from "./widgets/settings"
import {SceneControls} from "./scene/scene-controls"
import {Dialog, SidebarSection} from "./ui/dialog"
import {NewSceneDialog} from "./scene/new-scene-dialog"
import {SceneSidebar} from "./scene/scene-settings"
import {DeleteDialog} from "./scene/scene-controls"
import {AddDialog} from "./assets/add-dialog"
import {useOverlayAssets} from "./assets/use-overlay-assets"
import {WidgetLayers, moveWidgetToBackground} from "./widgets/shared/widget-layers"
import {widgetModule, type AddableWidgetType} from "./widgets/registry"
import {useOverlayScenes} from "./scene/use-overlay-scenes"
import {isGroupedField} from "./history/use-layout-history"
import {EditorSkeleton} from "./editor-skeleton"
import {EditorTab} from "./ui/dialog"

const EMPTY_CHAT: OverlayChat = {channel: null, url: null}

function OverlaySession({
    basePath,
    request,
    loginHref,
    previewIntervalMs,
    onRetry
}: {
    basePath: string
    request: OverlayRequest
    loginHref?: string
    previewIntervalMs: number
    onRetry: () => void
}) {
    const {
        overlay,
        scenes,
        loading,
        busy,
        error,
        setError,
        links,
        notice,
        setNotice,
        pendingScene,
        setPendingScene,
        history,
        dirty,
        path,
        reportError,
        selectScene,
        openScene,
        createScene,
        saveScene,
        rotateScene,
        renameScene,
        deleteScene
    } = useOverlayScenes(basePath, request)
    const {layout, setLayout} = history
    const [selection, setSelection] = useState<OverlaySelection>(null)
    const selectedId = selection?.type === "widget" ? selection.id : null
    const [playback, setPlayback] = useState<OverlayPlayback>(EMPTY_PLAYBACK)
    const [chat, setChat] = useState<OverlayChat>(EMPTY_CHAT)
    const [liveError, setLiveError] = useState<string | null>(null)
    const [previewAudio, setPreviewAudio] = useState(false)
    const [panelTab, setPanelTab] = useState<"layout" | "properties">("layout")
    const [addDialog, setAddDialog] = useState<"widgets" | "assets" | null>(null)
    const [createDialog, setCreateDialog] = useState(false)
    const [sceneRenaming, setSceneRenaming] = useState(false)
    const [sceneRenameValue, setSceneRenameValue] = useState("")
    const [sceneDeleteOpen, setSceneDeleteOpen] = useState(false)
    const media = useOverlayAssets(basePath, request, reportError)

    const overlayPresent = !!overlay
    useEffect(() => {
        if (!notice) return
        const timeout = setTimeout(() => setNotice(null), 6000)
        return () => clearTimeout(timeout)
    }, [notice, setNotice])
    useEffect(() => {
        if (!error || !overlayPresent) return
        const timeout = setTimeout(() => setError(null), 6000)
        return () => clearTimeout(timeout)
    }, [error, overlayPresent, setError])

    const overlayId = overlay?.id
    useEffect(() => {
        if (!overlayId) return
        const controller = new AbortController()
        let timer: ReturnType<typeof setTimeout> | undefined
        async function poll() {
            try {
                const result = await request<{playback: OverlayPlayback; chat: OverlayChat}>(`${path}/preview`, {
                    signal: controller.signal
                })
                if (controller.signal.aborted) return
                setPlayback(result.playback)
                setChat(result.chat)
                setLiveError(null)
            } catch (cause) {
                if (controller.signal.aborted) return
                setPlayback({status: "error", text: "Live-Daten momentan nicht erreichbar", albumUrl: null})
                setChat(EMPTY_CHAT)
                setLiveError("Live-Daten konnten nicht aktualisiert werden. Wir versuchen es erneut.")
                if (isAuthError(cause)) {
                    reportError(cause)
                    return
                }
            }
            if (!controller.signal.aborted) timer = setTimeout(() => void poll(), previewIntervalMs)
        }
        void poll()
        return () => {
            controller.abort()
            clearTimeout(timer)
        }
    }, [overlayId, path, request, reportError, previewIntervalMs])

    function updateWidget(widget: EditorWidget) {
        setLayout((current) =>
            current
                ? {...current, widgets: current.widgets.map((item) => (item.id === widget.id ? widget : item))}
                : null
        )
        setNotice(null)
    }

    function removeWidget(id: string) {
        setLayout((current) =>
            current ? {...current, widgets: current.widgets.filter((widget) => widget.id !== id)} : null
        )
        setSelection(null)
        setNotice(null)
    }

    function setWidgetBackground(id: string) {
        setLayout((current) => (current ? moveWidgetToBackground(current, id) : null))
        setNotice(null)
    }

    function updateLayout(next: OverlayLayout) {
        setLayout(next)
        setNotice(null)
    }

    function selectItem(item: OverlaySelection) {
        setSelection(item)
    }

    async function addLibraryAsset(id: string, x: number, y: number) {
        const asset = media.assets.find((item) => item.id === id)
        if (asset) addAssets([asset], x, y)
    }

    async function saveAndSwitchScene() {
        if (pendingScene && (await saveScene())) openScene(pendingScene)
    }

    function removeAsset(asset: OverlayAsset) {
        setError(null)
        if (layout?.widgets.some((widget) => isMediaWidget(widget) && widget.params.assetId === asset.id)) {
            setError(
                "Entferne das Medium zuerst aus der aktuellen Szene und speichere die Szene. Danach kannst du es löschen."
            )
            return
        }
        if (window.confirm(`„${asset.fileName}“ endgültig löschen?`)) void media.removeAsset(asset)
    }

    function addWidget(type: AddableWidgetType, design = "default") {
        if (!layout || layout.widgets.length >= MAX_OVERLAY_WIDGETS) return
        const module = widgetModule(type)
        const moduleDesign = module.designs[design] ?? module.designs[module.defaultDesign]
        const widget: EditorWidget = {
            id: crypto.randomUUID(),
            type,
            x: 80 + (layout.widgets.length % 8) * 40,
            y: 80 + (layout.widgets.length % 8) * 40,
            width: module.width,
            height: module.height,
            zIndex: Math.min(1000, Math.max(0, ...layout.widgets.map((item) => item.zIndex)) + 1),
            params: {
                design: moduleDesign.id,
                color: moduleDesign.color,
                backgroundColor: moduleDesign.backgroundColor,
                ...(type === "WINDOW" ? {title: "Fenster"} : {})
            }
        }
        setLayout({...layout, widgets: [...layout.widgets, widget]})
        setSelection({type: "widget", id: widget.id})
        setNotice(null)
    }

    function addPlacedAsset(asset: OverlayAsset, asBackground: boolean, fit: "contain" | "cover") {
        if (!layout || layout.widgets.length >= MAX_OVERLAY_WIDGETS) {
            setError(`Maximal ${MAX_OVERLAY_WIDGETS} Widgets pro Szene. Entferne zuerst ein Widget.`)
            return
        }
        const id = crypto.randomUUID()
        const background = asBackground
            ? {x: 0, y: 0, width: layout.width, height: layout.height, zIndex: 0}
            : {
                  x: 120,
                  y: 120,
                  width: 480,
                  height: 270,
                  zIndex: Math.min(1000, Math.max(0, ...layout.widgets.map((item) => item.zIndex)) + 1)
              }
        const widget: EditorWidget = {
            id,
            type: asset.kind,
            ...background,
            params: {
                design: layout.theme,
                color: "#ffffff",
                backgroundColor: "transparent",
                assetId: asset.id,
                fit
            }
        }
        setLayout({...layout, widgets: [...layout.widgets, widget]})
        setSelection({type: "widget", id})
        setNotice(null)
    }

    async function createWithTheme(name: string, scene: OverlayScene, theme: OverlayTheme, font: OverlayFont) {
        const created = await createScene(name, scene)
        if (created) {
            setLayout((current) => (current ? {...current, theme, font} : current))
        }
    }

    function addAssets(assets: OverlayAsset[], x = 120, y = 120) {
        const ids = assets.map(() => crypto.randomUUID())
        if (ids[0]) setSelection({type: "widget", id: ids[0]})
        setLayout((current) => {
            if (!current) return null
            const available = assets.slice(0, MAX_OVERLAY_WIDGETS - current.widgets.length)
            const top = Math.max(0, ...current.widgets.map((widget) => widget.zIndex))
            const widgets: EditorWidget[] = available.map((asset, index) => ({
                id: ids[index],
                type: asset.kind,
                x: Math.min(x + index * 30, current.width - 480),
                y: Math.min(y + index * 30, current.height - 270),
                width: 480,
                height: 270,
                zIndex: Math.min(1000, top + index + 1),
                params: {
                    design: current.theme,
                    color: "#ffffff",
                    backgroundColor: "transparent",
                    assetId: asset.id,
                    fit: "contain"
                }
            }))
            return {...current, widgets: [...current.widgets, ...widgets]}
        })
        setNotice(null)
    }

    async function uploadToCanvas(files: File[], x: number, y: number) {
        if (!layout || layout.widgets.length >= MAX_OVERLAY_WIDGETS) {
            setError(`Maximal ${MAX_OVERLAY_WIDGETS} Widgets pro Szene. Entferne zuerst ein Widget.`)
            return
        }
        setError(null)
        const assets = await media.uploadFiles(files)
        addAssets(assets, x, y)
    }

    const selected = layout?.widgets.find((widget) => widget.id === selectedId)
    const link = overlay ? (links[overlay.id] ?? null) : null
    return (
        <>
            {loading && <EditorSkeleton />}
            {error && !overlay && (
                <div className="notice error" role="alert">
                    <p>{error}</p>
                    <div className="actions">
                        {loginHref && (
                            <a className="button" href={loginHref}>
                                Mit Discord anmelden
                            </a>
                        )}
                        <button className="button" onClick={onRetry}>
                            Erneut versuchen
                        </button>
                    </div>
                </div>
            )}
            {!loading && (!error || overlay) && (
                <SceneControls
                    key={`${overlay?.id ?? "new"}-${overlay?.name ?? ""}`}
                    scenes={scenes}
                    selected={overlay}
                    busy={!!busy || media.uploading}
                    dirty={dirty}
                    obsUrl={link}
                    onSelect={selectScene}
                    onSave={() => void saveScene()}
                    onRotate={() => void rotateScene()}
                    onDelete={(id) => void deleteScene(id)}
                    onOpenCreate={() => setCreateDialog(true)}
                    onError={setError}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                    onUndo={() => {
                        history.undo()
                        setNotice(null)
                    }}
                    onRedo={() => {
                        history.redo()
                        setNotice(null)
                    }}
                />
            )}
            {!loading && !error && !overlay && (
                <div className="overlay-empty-state">
                    <p>Noch keine Szene vorhanden.</p>
                    <p>Erstelle die erste mit dem + oben links.</p>
                </div>
            )}
            {overlay && layout && (
                <>
                    {pendingScene && (
                        <Dialog
                            title="Ungespeicherte Änderungen"
                            onClose={() => setPendingScene(null)}
                            footer={
                                <>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={!!busy}
                                        onClick={() => setPendingScene(null)}
                                    >
                                        Hier bleiben
                                    </button>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={!!busy || media.uploading}
                                        onClick={() => openScene(pendingScene)}
                                    >
                                        Änderungen verwerfen & wechseln
                                    </button>
                                    <button
                                        type="button"
                                        className="button primary"
                                        disabled={!!busy || media.uploading}
                                        onClick={() => void saveAndSwitchScene()}
                                    >
                                        Speichern & wechseln
                                    </button>
                                </>
                            }
                        >
                            <p>Deine Änderungen an „{overlay.name}“ sind noch nicht gespeichert.</p>
                        </Dialog>
                    )}
                    {(error || notice || liveError) && (
                        <div
                            className={`overlay-snackbar ${error || liveError ? "error" : "success"}`}
                            role={error || liveError ? "alert" : "status"}
                        >
                            <span className="overlay-snackbar-dot" aria-hidden="true" />
                            <p>{error ?? liveError ?? notice}</p>
                            <button
                                type="button"
                                className="overlay-icon-button overlay-icon-button--sm"
                                aria-label="Meldung schließen"
                                onClick={() => {
                                    setError(null)
                                    setNotice(null)
                                    setLiveError(null)
                                }}
                            >
                                <svg
                                    aria-hidden="true"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M4.9948 3.93414L8.00001 6.93935L11.0052 3.93414L12.0659 4.9948L9.06067 8.00001L12.0659 11.0052L11.0052 12.0659L8.00001 9.06067L4.9948 12.0659L3.93414 11.0052L6.93935 8.00001L3.93414 4.9948L4.9948 3.93414Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                    <div
                        className="overlay-workspace"
                        onFocusCapture={(event) => {
                            if (isGroupedField(event.target)) history.begin("field")
                        }}
                        onBlurCapture={() => history.end()}
                        onKeyDownCapture={(event) => {
                            if (!event.repeat && event.key.startsWith("Arrow") && !isGroupedField(event.target))
                                history.begin("keyboard")
                        }}
                        onKeyUpCapture={(event) => {
                            if (event.key.startsWith("Arrow") && !isGroupedField(event.target)) history.end()
                        }}
                    >
                        <section className="overlay-preview-section">
                            <OverlayCanvas
                                key={overlay.id}
                                layout={layout}
                                playback={playback}
                                chat={chat}
                                selection={selection}
                                onSelect={selectItem}
                                onChange={updateWidget}
                                onRemove={removeWidget}
                                audioEnabled={previewAudio}
                                assets={media.assets}
                                onEditStart={() => history.begin("pointer")}
                                onEditEnd={history.end}
                                onGuidesChange={(guides) => updateLayout({...layout, guides})}
                                onDropFiles={(files, x, y) => void uploadToCanvas(files, x, y)}
                                onDropAsset={addLibraryAsset}
                            />
                        </section>
                        <aside className="overlay-sidebar">
                            <div className="overlay-sidebar-tabs" role="tablist" aria-label="Overlay-Werkzeuge">
                                <EditorTab active={panelTab === "layout"} onClick={() => setPanelTab("layout")}>
                                    Layout
                                </EditorTab>
                                <EditorTab active={panelTab === "properties"} onClick={() => setPanelTab("properties")}>
                                    Eigenschaften
                                </EditorTab>
                            </div>
                            <div className="overlay-sidebar-content">
                                {panelTab === "layout" && (
                                    <section id="overlay-panel-layout" role="tabpanel" aria-label="Layout">
                                        <div className="overlay-settings-block">
                                            <SidebarSection label="Ebenen" defaultOpen>
                                                <button
                                                    type="button"
                                                    className="button overlay-layers-add"
                                                    onClick={() => setAddDialog("widgets")}
                                                >
                                                    Neue Ebene hinzufügen
                                                </button>
                                                <WidgetLayers
                                                    layout={layout}
                                                    assets={media.assets}
                                                    selectedId={selectedId}
                                                    onSelect={(id) => selectItem({type: "widget", id})}
                                                    onRemove={removeWidget}
                                                    onChange={updateLayout}
                                                />
                                            </SidebarSection>
                                        </div>
                                        <div className="overlay-settings-block">
                                            <SceneSidebar
                                                layout={layout}
                                                onChange={updateLayout}
                                                only="theme"
                                                onEditStart={() => history.begin("pointer")}
                                                onEditEnd={history.end}
                                            />
                                        </div>
                                    </section>
                                )}
                                {panelTab === "properties" && (
                                    <section id="overlay-panel-properties" role="tabpanel" aria-label="Eigenschaften">
                                        {selected ? (
                                            <WidgetSettings
                                                widget={selected}
                                                assets={media.assets}
                                                onChange={updateWidget}
                                                onRemove={() => removeWidget(selected.id)}
                                                onSetBackground={() => setWidgetBackground(selected.id)}
                                                previewAudio={previewAudio}
                                                onPreviewAudioChange={setPreviewAudio}
                                                onEditStart={() => history.begin("pointer")}
                                                onEditEnd={history.end}
                                            />
                                        ) : (
                                            <div className="overlay-properties-empty">
                                                <div className="overlay-settings-head">
                                                    {sceneRenaming ? (
                                                        <input
                                                            className="overlay-settings-rename"
                                                            value={sceneRenameValue}
                                                            autoFocus
                                                            maxLength={80}
                                                            aria-label="Szene umbenennen"
                                                            onChange={(event) =>
                                                                setSceneRenameValue(event.target.value)
                                                            }
                                                            onBlur={() => {
                                                                setSceneRenaming(false)
                                                                const name = sceneRenameValue.trim()
                                                                if (name && overlay && name !== overlay.name)
                                                                    void renameScene(name)
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter") event.currentTarget.blur()
                                                                if (event.key === "Escape") setSceneRenaming(false)
                                                            }}
                                                        />
                                                    ) : (
                                                        <h3 className="overlay-settings-scene">{overlay.name}</h3>
                                                    )}
                                                    <div className="overlay-settings-actions">
                                                        <button
                                                            type="button"
                                                            className="overlay-icon-button"
                                                            aria-label="Szene umbenennen"
                                                            title="Umbenennen"
                                                            onClick={() => {
                                                                setSceneRenameValue(overlay.name)
                                                                setSceneRenaming(true)
                                                            }}
                                                        >
                                                            <svg
                                                                aria-hidden="true"
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 16 16"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <path
                                                                    d="M2.59998 13.4L3.59998 10.2L10.7 3.09999C11.1 2.69999 11.8 2.69999 12.2 3.09999C12.6 3.49999 12.6 4.19999 12.2 4.59999L5.09998 11.7L2.59998 13.4Z"
                                                                    fill="currentColor"
                                                                />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="overlay-icon-button"
                                                            aria-label="Szene löschen"
                                                            title="Szene löschen"
                                                            disabled={!!busy || scenes.length <= 1}
                                                            onClick={() => setSceneDeleteOpen(true)}
                                                        >
                                                            <svg
                                                                aria-hidden="true"
                                                                width="16"
                                                                height="16"
                                                                viewBox="0 0 16 16"
                                                                fill="none"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <path d="M3.5 4H12.5V5.4H3.5V4Z" fill="currentColor" />
                                                                <path
                                                                    d="M6.40002 2.39999H9.60002V3.59999H6.40002V2.39999Z"
                                                                    fill="currentColor"
                                                                />
                                                                <path
                                                                    d="M4.70001 6H11.3L10.7 13.4H5.30001L4.70001 6Z"
                                                                    fill="currentColor"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <SceneSidebar
                                                    layout={layout}
                                                    onChange={updateLayout}
                                                    only="scene"
                                                    onEditStart={() => history.begin("pointer")}
                                                    onEditEnd={history.end}
                                                />
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>
                        </aside>
                    </div>
                </>
            )}
            {createDialog && (
                <NewSceneDialog
                    busy={!!busy}
                    onClose={() => setCreateDialog(false)}
                    onCreate={(name, scene, theme, font) => void createWithTheme(name, scene, theme, font)}
                />
            )}
            {overlay && layout && (
                <>
                    {sceneDeleteOpen && overlay && (
                        <DeleteDialog
                            selected={overlay}
                            busy={!!busy}
                            onDelete={(id) => void deleteScene(id)}
                            onClose={() => setSceneDeleteOpen(false)}
                        />
                    )}
                    {addDialog && (
                        <AddDialog
                            defaultTab={addDialog}
                            widgetCount={layout.widgets.length}
                            maxWidgets={MAX_OVERLAY_WIDGETS}
                            assets={media.assets}
                            assetsLoading={media.loading}
                            uploading={media.uploading}
                            deletingId={media.deletingId}
                            assetProgress={media.progress}
                            onAddWidget={addWidget}
                            onUploadAssets={(files) => {
                                setError(null)
                                void media.uploadFiles(files)
                            }}
                            onRemoveAsset={removeAsset}
                            onAddAsset={addPlacedAsset}
                            onClose={() => setAddDialog(null)}
                        />
                    )}
                </>
            )}
        </>
    )
}

export type OverlayLinkProps = {
    href: string
    className?: string
    children?: ReactNode
}

export type OverlayEditorProps = {
    basePath: string
    request: OverlayRequest
    backHref?: string
    loginHref?: string
    title?: string
    backLabel?: string
    previewIntervalMs?: number
    linkComponent?: ElementType<OverlayLinkProps>
}

export function OverlayEditor({
    basePath,
    request,
    backHref,
    loginHref,
    backLabel,
    previewIntervalMs = 5000
}: OverlayEditorProps) {
    const [revision, setRevision] = useState(0)
    const stableRequest = useStableRequest(request)
    void backHref
    void backLabel
    return (
        <section className="overlay-editor">
            <OverlaySession
                key={`${basePath}-${revision}`}
                basePath={basePath}
                request={stableRequest}
                loginHref={loginHref}
                previewIntervalMs={Math.max(1000, previewIntervalMs)}
                onRetry={() => setRevision((value) => value + 1)}
            />
        </section>
    )
}
