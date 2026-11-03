import Link from "next/link"
import type {ReactNode} from "react"
import {versionInfo, versionLabel} from "@streamcat/core/version"

export default function SiteLayout({children}: {children: ReactNode}) {
    return (
        <div className="site-shell">
            <a className="skip-link" href="#main-content">
                Zum Inhalt
            </a>
            <header className="header">
                <div className="header-inner">
                    <Link className="brand" href="/">
                        <span className="brand-mark" aria-hidden="true">
                            ᓚ₍ ^. .^₎
                        </span>
                        StreamCat
                        <span className="brand-context">/ terminal</span>
                    </Link>
                    <nav aria-label="Hauptnavigation">
                        <Link href="/dashboard">
                            <span aria-hidden="true">&gt; </span>Meine Server
                        </Link>
                    </nav>
                </div>
            </header>
            <main id="main-content">{children}</main>
            <footer>
                <div className="footer-inner">
                    <span>Discord / Twitch / Spotify</span>
                    <span title={versionInfo.builtAt ? `Build: ${versionInfo.builtAt}` : "Local development"}>
                        {versionLabel}
                    </span>
                </div>
            </footer>
        </div>
    )
}
