import {useEffect, useState, type MouseEvent} from "react"
import {OverlayEditor} from "@streamcat/overlay-engine"
import {Guild} from "../../web/components/dashboard/guild"
import {Servers} from "../../web/components/dashboard/servers"
import {DEMO_BASE_PATH, DEMO_GUILD_ID} from "./mock/seed"
import {clearDemoScenes} from "./mock/storage"
import {demoRequest} from "./mock/transport"

const SESSION_KEY = "streamcat-demo-session-v1"
type DemoView = "intro" | "dashboard" | "guild" | "editor"

const DEMO_GUILD_NAME = "StreamCat Demo"

function hasSession(): boolean {
    try {
        return localStorage.getItem(SESSION_KEY) === "1"
    } catch {
        return false
    }
}

function rememberSession(enabled: boolean): void {
    try {
        if (enabled) localStorage.setItem(SESSION_KEY, "1")
        else localStorage.removeItem(SESSION_KEY)
    } catch {
        // The demo still works when browser storage is unavailable.
    }
}

function viewFromLocation(): DemoView {
    const view = new URLSearchParams(window.location.search).get("view")
    if (view === "intro" || view === "dashboard" || view === "guild" || view === "editor") return view
    return "intro"
}

const FEATURES = [
    {
        title: "Dashboard",
        description: "Öffne deine Serverübersicht wie in der echten App."
    },
    {
        title: "Serveransicht",
        description: "Sieh Twitch- und Spotify-Verbindungen, Song Requests und gefolgte Kanäle."
    },
    {
        title: "Overlay-Editor",
        description: "Ziehe Widgets, ändere Farben und erstelle Szenen auf der 1920×1080-Fläche."
    },
    {
        title: "Lokal",
        description: "Mock-Daten bleiben in deinem Browser. Keine Anmeldung, kein Server, keine echten Stream-Daten."
    }
] as const

function DemoHeader({
    view,
    entered,
    onHome,
    onEnter,
    onReset
}: {
    view: DemoView
    entered: boolean
    onHome: () => void
    onEnter: () => void
    onReset: () => void
}) {
    const labels: Record<DemoView, string> = {
        intro: "Startseite",
        dashboard: "Meine Server",
        guild: `Server / ${DEMO_GUILD_NAME}`,
        editor: `Server / ${DEMO_GUILD_NAME}`
    }

    return (
        <header className="site-header">
            <div className="site-header-brand">
                <a
                    className="site-header-brand-link"
                    href="?view=intro"
                    onClick={(event) => {
                        event.preventDefault()
                        onHome()
                    }}
                >
                    <span className="site-header-logo" aria-hidden="true">
                        ᓚ₍ ^. .^₎
                    </span>
                    <span className="site-header-name">StreamCat</span>
                    <span className="site-header-separator" aria-hidden="true">
                        /
                    </span>
                    <span className="site-header-path">demo</span>
                </a>
                <span className="site-header-rule" aria-hidden="true" />
                <span className="site-header-label">{labels[view]}</span>
            </div>
            <div className="site-header-right">
                <span className="demo-badge">STATIC DEMO</span>
                {entered && view !== "intro" ? (
                    <button type="button" className="site-header-login demo-header-button" onClick={onReset}>
                        Demo zurücksetzen
                    </button>
                ) : (
                    <button type="button" className="site-header-login demo-header-button" onClick={onEnter}>
                        {entered ? "Weiter zum Dashboard" : "Demo Login"}
                    </button>
                )}
            </div>
        </header>
    )
}

function DemoIntro({entered, onEnter}: {entered: boolean; onEnter: () => void}) {
    return (
        <main id="main-content" className="demo-main">
            <div className="home demo-home">
                <section className="hero" aria-labelledby="demo-title">
                    <h1 id="demo-title" className="hero-logo">
                        <span className="hero-logo-cat" aria-hidden="true">
                            ᓚ₍ ^. .^₎
                        </span>
                        <span className="hero-logo-name">StreamCat</span>
                    </h1>
                    <p className="hero-tagline">
                        Probiere Dashboard, Serveransicht und den echten Overlay-Editor direkt im Browser. Alles läuft
                        mit lokalen Mock-Daten und bleibt auf deinem Gerät.
                    </p>
                    <div className="hero-actions">
                        <button type="button" className="button button--primary" onClick={onEnter}>
                            {entered ? "Weiter zum Dashboard" : "Demo Login"}
                        </button>
                        <a
                            className="button button--secondary"
                            href="https://github.com/PhilBode/StreamCat"
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>
                    </div>
                    <p className="demo-footnote">Keine Discord-Anmeldung. Keine Daten verlassen deinen Browser.</p>
                </section>
                <section className="feature-index" aria-label="Demo-Funktionen">
                    <h2 className="feature-index-title">Was du ausprobieren kannst</h2>
                    <ul className="feature-grid">
                        {FEATURES.map((feature) => (
                            <li className="feature-card" key={feature.title}>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </li>
                        ))}
                    </ul>
                </section>
                <p className="demo-note">
                    Diese Seite ist eine statische Demo mit Mock-Daten. Echte Discord-Server, Musikdienste und OBS-Links
                    sind nicht verbunden.
                </p>
            </div>
        </main>
    )
}

function DemoFooter({view, entered}: {view: DemoView; entered: boolean}) {
    return (
        <footer className="demo-footer" role="contentinfo">
            <span className="demo-footer-status">
                <span className="demo-dot" aria-hidden="true" />
                Static Demo · Mock-Daten
            </span>
            <span className="demo-footer-note">
                {entered
                    ? view === "editor"
                        ? "Änderungen bleiben lokal im Browser"
                        : "Keine echten Dienste verbunden"
                    : "Keine Anmeldung nötig"}
            </span>
            <a
                className="demo-footer-link"
                href="https://github.com/PhilBode/StreamCat"
                target="_blank"
                rel="noreferrer"
            >
                GitHub
            </a>
        </footer>
    )
}

export function App() {
    const [entered, setEntered] = useState(hasSession)
    const [view, setView] = useState<DemoView>(() => (hasSession() ? viewFromLocation() : "intro"))

    useEffect(() => {
        const onPopState = () => setView(hasSession() ? viewFromLocation() : "intro")
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])

    useEffect(() => {
        const labels: Record<DemoView, string> = {
            intro: "Demo",
            dashboard: "Meine Server",
            guild: "Server",
            editor: "Overlay-Editor"
        }
        document.title = `${labels[view]} · StreamCat Demo`
    }, [view])

    function navigate(next: DemoView, replace = false) {
        const url = new URL(window.location.href)
        url.searchParams.set("view", next)
        if (next !== "editor") url.searchParams.delete("scene")
        window.history[replace ? "replaceState" : "pushState"](null, "", url.toString())
        setView(next)
    }

    function enterDemo() {
        rememberSession(true)
        setEntered(true)
        const target = viewFromLocation()
        navigate(target === "intro" ? "dashboard" : target, true)
    }

    function goHome() {
        navigate("intro")
    }

    function resetDemo() {
        if (!window.confirm("Demo-Daten zurücksetzen? Deine lokalen Szenen und Änderungen gehen verloren.")) return
        clearDemoScenes()
        rememberSession(false)
        window.history.replaceState(null, "", window.location.pathname)
        window.location.reload()
    }

    function handleDemoLink(event: MouseEvent<HTMLDivElement>) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return
        const target = event.target
        const anchor = target instanceof Element ? target.closest("a") : null
        if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return
        const href = anchor.getAttribute("href")
        if (!href) return
        const path = new URL(href, window.location.origin).pathname
        if (!path.startsWith("/dashboard")) return
        event.preventDefault()
        if (path === "/dashboard" || path === "/dashboard/") navigate("dashboard")
        else if (/^\/dashboard\/[^/]+\/overlay\/?$/.test(path)) navigate("editor")
        else if (/^\/dashboard\/[^/]+\/?$/.test(path)) navigate("guild")
    }

    return (
        <div className="site-shell demo-shell" onClickCapture={handleDemoLink}>
            <DemoHeader view={view} entered={entered} onHome={goHome} onEnter={enterDemo} onReset={resetDemo} />
            {!entered ? (
                <DemoIntro entered={false} onEnter={enterDemo} />
            ) : view === "intro" ? (
                <DemoIntro entered onEnter={enterDemo} />
            ) : (
                <>
                    {view === "dashboard" ? (
                        <main id="main-content" className="demo-page-main">
                            <Servers />
                        </main>
                    ) : view === "guild" ? (
                        <main id="main-content" className="demo-page-main">
                            <Guild
                                guildId={DEMO_GUILD_ID}
                                oauthResult={null}
                                oauthFailureReason={null}
                                spotifyRedirectUri={null}
                            />
                        </main>
                    ) : (
                        <main id="main-content" className="demo-editor-main">
                            <div className="demo-desktop-only">
                                <p className="demo-kicker">Overlay-Editor</p>
                                <h1>Desktop-Demo</h1>
                                <p>
                                    Der Overlay-Editor braucht eine größere Fläche. Öffne die Demo auf einem
                                    Desktop-Browser, um Widgets zu ziehen und Szenen zu bearbeiten.
                                </p>
                                <a
                                    className="button button--secondary"
                                    href="https://github.com/PhilBode/StreamCat"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    GitHub
                                </a>
                            </div>
                            <OverlayEditor
                                basePath={DEMO_BASE_PATH}
                                request={demoRequest}
                                demoMode
                                previewIntervalMs={5000}
                            />
                        </main>
                    )}
                </>
            )}
            <DemoFooter view={view} entered={entered} />
        </div>
    )
}
