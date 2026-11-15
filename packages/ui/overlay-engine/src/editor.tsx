"use client"

import {useEffect, useState, type ElementType, type ReactNode} from "react"
import {
    MAX_OVERLAY_WIDGETS,
    WIDGET_DESIGNS,
    isMediaWidget,
    type EditorWidget,
    type EditorWidgetType,
    type OverlayChat,
    type OverlayPlayback,
    type OverlayAsset,
    type OverlayLayout
} from "@streamcat/interfaces"
import {isAuthError, type OverlayRequest} from "./api/transport"
import {useStableRequest} from "./api/use-stable-request"
import {OverlayCanvas, type OverlaySelection} from "./canvas"
import {EMPTY_PLAYBACK} from "./renderer"
import {WIDGET_DEFINITIONS} from "./widgets/definitions"
import {WidgetSettings} from "./widgets/widget-settings"
import {SceneControls} from "./scene/scene-controls"
import {SceneSettings} from "./scene/scene-settings"
import {ObsLink} from "./scene/obs-link"
import {AssetLibrary} from "./assets/asset-library"
import {useOverlayAssets} from "./assets/use-overlay-assets"
import {WidgetLayers, moveWidgetToBackground} from "./widgets/widget-layers"
import {useOverlayScenes} from "./scene/use-overlay-scenes"
import {isGroupedField} from "./history/use-layout-history"
import {EditorSkeleton} from "./editor-skeleton"

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
        renameScene
    } = useOverlayScenes(basePath, request)
    const {layout, setLayout} = history
    const [selection, setSelection] = useState<OverlaySelection>(null)
    const selectedId = selection?.type === "widget" ? selection.id : null
    const [playback, setPlayback] = useState<OverlayPlayback>(EMPTY_PLAYBACK)
    const [chat, setChat] = useState<OverlayChat>(EMPTY_CHAT)
    const [liveError, setLiveError] = useState<string | null>(null)
    const [previewAudio, setPreviewAudio] = useState(false)
    const [sidebar, setSidebar] = useState<"widgets" | "design" | "assets">("widgets")
    const media = useOverlayAssets(basePath, request, reportError)

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
        if (item?.type === "widget") setSidebar("widgets")
    }

    function addLibraryAsset(id: string, x: number, y: number) {
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

    function addWidget(type: Extract<EditorWidgetType, "TWITCH_CHAT" | "SPOTIFY_NOW_PLAYING" | "WINDOW">) {
        if (!layout || layout.widgets.length >= MAX_OVERLAY_WIDGETS) return
        const design = WIDGET_DESIGNS[layout.theme]
        const widget: EditorWidget = {
            id: crypto.randomUUID(),
            type,
            x: 80 + (layout.widgets.length % 8) * 40,
            y: 80 + (layout.widgets.length % 8) * 40,
            width: WIDGET_DEFINITIONS[type].width,
            height: WIDGET_DEFINITIONS[type].height,
            zIndex: Math.min(1000, Math.max(0, ...layout.widgets.map((item) => item.zIndex)) + 1),
            params: {
                design: layout.theme,
                color: design.color,
                backgroundColor: design.backgroundColor,
                ...(type === "WINDOW" ? {title: "Fenster"} : {})
            }
        }
        setLayout({...layout, widgets: [...layout.widgets, widget]})
        setSelection({type: "widget", id: widget.id})
        setNotice(null)
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
        if (ids.length) setSidebar("widgets")
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
            {error && (
                <div className="notice error" role="alert">
                    <p>{error}</p>
                    {!overlay && (
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
                    )}
                </div>
            )}
            {overlay && (
                <ObsLink
                    key={`${overlay.id}-${link ?? ""}`}
                    url={link}
                    busy={!!busy || media.uploading}
                    onReset={() => void rotateScene()}
                    onError={setError}
                />
            )}
            {!loading && (!error || overlay) && (
                <SceneControls
                    key={`${overlay?.id ?? "new"}-${overlay?.name ?? ""}`}
                    scenes={scenes}
                    selected={overlay}
                    busy={!!busy || media.uploading}
                    dirty={dirty}
                    onSelect={selectScene}
                    onCreate={(name, scene) => void createScene(name, scene)}
                    onRename={(name) => void renameScene(name)}
                    onSave={() => void saveScene()}
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
            {overlay && layout && (
                <>
                    {pendingScene && (
                        <div className="notice overlay-switch-confirm" role="alert">
                            <p>Deine Änderungen an „{overlay.name}“ sind noch nicht gespeichert.</p>
                            <div className="actions">
                                <button
                                    className="button primary"
                                    disabled={!!busy || media.uploading}
                                    onClick={() => void saveAndSwitchScene()}
                                >
                                    Speichern & wechseln
                                </button>
                                <button
                                    className="button"
                                    disabled={!!busy || media.uploading}
                                    onClick={() => openScene(pendingScene)}
                                >
                                    Änderungen verwerfen & wechseln
                                </button>
                                <button className="button" disabled={!!busy} onClick={() => setPendingScene(null)}>
                                    Hier bleiben
                                </button>
                            </div>
                        </div>
                    )}
                    {notice && (
                        <p className="notice success" role="status">
                            {notice}
                        </p>
                    )}
                    {liveError && (
                        <p className="notice error" role="status">
                            {liveError}
                        </p>
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
                        <aside className="panel overlay-sidebar">
                            <div className="overlay-sidebar-tabs" role="tablist" aria-label="Overlay-Werkzeuge">
                                {(["widgets", "design", "assets"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        className={`button ${sidebar === tab ? "selected" : ""}`}
                                        role="tab"
                                        aria-selected={sidebar === tab}
                                        aria-controls={`overlay-panel-${tab}`}
                                        id={`overlay-tab-${tab}`}
                                        onClick={() => setSidebar(tab)}
                                    >
                                        {{widgets: "Widgets", design: "Design", assets: "Assets"}[tab]}
                                    </button>
                                ))}
                            </div>
                            <section
                                id="overlay-panel-design"
                                role="tabpanel"
                                aria-labelledby="overlay-tab-design"
                                hidden={sidebar !== "design"}
                            >
                                <SceneSettings key={overlay.id} layout={layout} onChange={updateLayout} />
                            </section>
                            <section
                                id="overlay-panel-assets"
                                role="tabpanel"
                                aria-labelledby="overlay-tab-assets"
                                hidden={sidebar !== "assets"}
                            >
                                <AssetLibrary
                                    assets={media.assets}
                                    loading={media.loading}
                                    uploading={media.uploading}
                                    deletingId={media.deletingId}
                                    progress={media.progress}
                                    full={layout.widgets.length >= MAX_OVERLAY_WIDGETS}
                                    onUpload={(files) => {
                                        setError(null)
                                        void media.uploadFiles(files)
                                    }}
                                    onAdd={(asset) => addAssets([asset])}
                                    onRemove={removeAsset}
                                />
                            </section>
                            <section
                                id="overlay-panel-widgets"
                                role="tabpanel"
                                aria-labelledby="overlay-tab-widgets"
                                hidden={sidebar !== "widgets"}
                            >
                                <h2>Widgets</h2>
                                <p className="muted overlay-hint">Füge ein Widget hinzu und ziehe es in deine Szene.</p>
                                <div className="overlay-catalog">
                                    <button
                                        className="button"
                                        onClick={() => addWidget("SPOTIFY_NOW_PLAYING")}
                                        disabled={layout.widgets.length >= MAX_OVERLAY_WIDGETS}
                                    >
                                        ＋ Spotify
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() => addWidget("TWITCH_CHAT")}
                                        disabled={layout.widgets.length >= MAX_OVERLAY_WIDGETS}
                                    >
                                        ＋ Twitch-Chat
                                    </button>
                                    <button
                                        className="button"
                                        onClick={() => addWidget("WINDOW")}
                                        disabled={layout.widgets.length >= MAX_OVERLAY_WIDGETS}
                                    >
                                        ＋ Fenster
                                    </button>
                                </div>
                                <p className="muted overlay-hint">
                                    {layout.widgets.length} / {MAX_OVERLAY_WIDGETS} Widgets
                                </p>
                                <WidgetLayers
                                    layout={layout}
                                    assets={media.assets}
                                    selectedId={selectedId}
                                    onSelect={(id) => selectItem({type: "widget", id})}
                                    onRemove={removeWidget}
                                    onChange={updateLayout}
                                />
                                {selected ? (
                                    <WidgetSettings
                                        widget={selected}
                                        assets={media.assets}
                                        onChange={updateWidget}
                                        onRemove={() => removeWidget(selected.id)}
                                        onSetBackground={() => setWidgetBackground(selected.id)}
                                        previewAudio={previewAudio}
                                        onPreviewAudioChange={setPreviewAudio}
                                    />
                                ) : (
                                    <p className="muted overlay-hint">
                                        Wähle ein Widget aus, um Größe und Farben anzupassen.
                                    </p>
                                )}
                            </section>
                        </aside>
                        <section className="overlay-preview-section">
                            <div className="overlay-preview-heading">
                                <h2>Live-Vorschau</h2>
                                <span
                                    className="muted"
                                    title="Editor-Koordinaten; die Ausgabe skaliert auf die Auflösung deiner OBS-Browser-Quelle."
                                >
                                    1920 × 1080 (Referenz)
                                </span>
                            </div>
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
                            {layout.widgets.length === 0 && (
                                <p className="muted">
                                    Deine Szene ist leer. Füge ein Widget über die Werkzeugleiste hinzu.
                                </p>
                            )}
                        </section>
                    </div>
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
    backHref: string
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
    title = "Overlay gestalten",
    backLabel = "Zur Serverübersicht",
    previewIntervalMs = 5000,
    linkComponent
}: OverlayEditorProps) {
    const [revision, setRevision] = useState(0)
    const stableRequest = useStableRequest(request)
    const LinkComponent = linkComponent ?? "a"
    return (
        <section className="overlay-editor">
            <header className="overlay-editor-heading">
                <LinkComponent className="back-link" href={backHref}>
                    {backLabel}
                </LinkComponent>
                <h1>{title}</h1>
            </header>
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
