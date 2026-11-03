import type {Metadata} from "next"
import type {ReactNode} from "react"
import "./globals.css"
import "../components/overlay/overlay.css"
import "../components/overlay/editor.css"

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
