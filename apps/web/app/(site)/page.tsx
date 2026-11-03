import Link from "next/link"
import {headers} from "next/headers"
import {backendUrl} from "../../lib/backend"

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

export default async function Home({searchParams}: {searchParams: Promise<{login?: string}>}) {
    const {login} = await searchParams
    const session = await sessionStatus()
    return (
        <div className="home">
            <section className="hero" aria-labelledby="home-title">
                <div className="hero-copy">
                    <p className="terminal-caption">Discord · Twitch · Spotify · OBS</p>
                    <h1 id="home-title">
                        Dein Stream.
                        <br />
                        Deine Szene.
                    </h1>
                    <p className="hero-description">
                        Baue dein Overlay, sammle Song Requests und bring deinen Stream auf Discord. Ein Dashboard für
                        dein Setup.
                    </p>
                    <p className="muted">
                        {session === "guest"
                            ? "Melde dich mit Discord an und wähle deinen Server."
                            : "Öffne einen Server, den du besitzt oder als Administrator verwaltest."}
                    </p>
                    {login && session === "guest" && (
                        <p role="alert" className="error">
                            {login === "invalid"
                                ? "Die Discord-Anmeldung wurde abgebrochen oder ist abgelaufen. Bitte starte den Login erneut auf dieser Seite."
                                : "Die Discord-Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es später erneut."}
                        </p>
                    )}
                    {session === "unavailable" && (
                        <p role="alert" className="error">
                            Deine Anmeldung konnte gerade nicht geprüft werden. Bitte versuche es im Dashboard erneut.
                        </p>
                    )}
                    <div className="actions">
                        {session === "guest" && (
                            <a className="button primary" href="/api/backend/dashboard/auth/login">
                                Mit Discord anmelden
                            </a>
                        )}
                        {session !== "guest" && (
                            <Link className="button primary" href="/dashboard">
                                Weiter zum Dashboard
                            </Link>
                        )}
                        {session === "authenticated" && (
                            <form action="/api/backend/dashboard/auth/logout" method="post">
                                <button className="button">Abmelden</button>
                            </form>
                        )}
                    </div>
                </div>
            </section>
            <section className="service-index" aria-label="StreamCat-Funktionen">
                <h2>Alles für deinen Stream, an einem Ort</h2>
                <dl>
                    <div>
                        <dt>
                            <span className="service-number" aria-hidden="true">
                                01
                            </span>
                            Discord
                        </dt>
                        <dd>Verwalte deine Server und kündige Streams im passenden Channel an.</dd>
                    </div>
                    <div>
                        <dt>
                            <span className="service-number" aria-hidden="true">
                                02
                            </span>
                            Twitch
                        </dt>
                        <dd>Zeige deinen Chat im Overlay und empfange Musikwünsche aus deinem Stream.</dd>
                    </div>
                    <div>
                        <dt>
                            <span className="service-number" aria-hidden="true">
                                03
                            </span>
                            Spotify
                        </dt>
                        <dd>Song Requests landen direkt in deiner Queue. Der aktuelle Song im Overlay.</dd>
                    </div>
                    <div>
                        <dt>
                            <span className="service-number" aria-hidden="true">
                                04
                            </span>
                            OBS
                        </dt>
                        <dd>Platziere Widgets, Bilder und Videos. Jede Szene bekommt ihren eigenen Link.</dd>
                    </div>
                </dl>
            </section>
        </div>
    )
}
