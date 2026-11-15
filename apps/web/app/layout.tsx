import type {Metadata} from "next"
import type {ReactNode} from "react"
import "./globals.css"
import "@streamcat/overlay-engine/styles.css"

export const metadata: Metadata = {
    title: "StreamCat",
    description: "Dein Discord-Server, Twitch und Spotify an einem Ort."
}

export default function Layout({children}: {children: ReactNode}) {
    return (
        <html lang="de">
            <body>{children}</body>
        </html>
    )
}
