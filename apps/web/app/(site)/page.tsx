import {headers} from "next/headers"
import {SiteHeader} from "@/components/layout/site-header"
import {ButtonLink} from "@/components/ui/button"
import {backendUrl} from "../../lib/backend"
import "./home.css"

async function sessionStatus(): Promise<"guest" | "authenticated" | "unavailable"> {
    const cookie = (await headers()).get("cookie")
    if (!cookie) return "guest"
    try {
        const response = await fetch(`${backendUrl}/dashboard/me`, {
            headers: {cookie},
            cache: "no-store",
            signal: AbortSignal.timeout(5000)
        })
        if (response.ok) return "authenticated"
        if (response.status === 401) return "guest"
        console.error(`[Home] Session check failed status=${response.status}`)
    } catch {
        console.error("[Home] Session check unavailable")
    }
    return "unavailable"
}

const FEATURES = [
    {
        title: "Discord",
        description: "Verwalte deine Server und kündige Streams im passenden Channel an."
    },
    {
        title: "Twitch",
        description: "Zeige deinen Chat im Overlay und empfange Song-Requests für deinen Stream."
    },
    {
        title: "Spotify",
        description: "Song Requests landen direkt in deiner Queue. Dein aktueller Song kann im Overlay angezeigt werden"
    },
    {
        title: "OBS",
        description: "Schnelles Setup, da jede Szene nur einen Link braucht."
    }
] as const

export default async function Home({searchParams}: {searchParams: Promise<{login?: string}>}) {
    const {login} = await searchParams
    const session = await sessionStatus()
    return (
        <>
            <SiteHeader context={{path: "start", label: "Startseite"}} />
            <div className="home">
                <section className="hero" aria-labelledby="home-title">
                    <h1 id="home-title" className="hero-logo">
                        <span className="hero-logo-cat" aria-hidden="true">
                            ᓚ₍ ^. .^₎
                        </span>
                        <span className="hero-logo-name">StreamCat</span>
                    </h1>
                    <p className="hero-tagline">
                        Ein Dashboard für dein Setup, baue dir dein eigenes Overlay und richte Song-Requests und
                        Notifications für deine Streams ein.
                    </p>
                    <div className="hero-actions">
                        {session === "guest" && (
                            <ButtonLink href="/api/backend/dashboard/auth/login">Mit Discord anmelden</ButtonLink>
                        )}
                        {session === "authenticated" && <ButtonLink href="/dashboard">Weiter zum Dashboard</ButtonLink>}
                    </div>
                    {login && session === "guest" && (
                        <p role="alert" className="home-alert">
                            {login === "invalid"
                                ? "Die Discord-Anmeldung wurde abgebrochen oder ist abgelaufen. Bitte starte den Login erneut auf dieser Seite."
                                : "Die Discord-Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es später erneut."}
                        </p>
                    )}
                    {session === "unavailable" && (
                        <p role="alert" className="home-alert">
                            Deine Anmeldung konnte gerade nicht geprüft werden. Bitte versuche es im Dashboard erneut.
                        </p>
                    )}
                </section>
                <section className="feature-index" aria-label="StreamCat-Funktionen">
                    <h2 className="feature-index-title">Alles für deinen Stream, an einem Ort.</h2>
                    <ul className="feature-grid">
                        {FEATURES.map((feature) => (
                            <li className="feature-card" key={feature.title}>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </>
    )
}
