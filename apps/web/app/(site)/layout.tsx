import type {ReactNode} from "react"
import {SiteFooter} from "@/components/layout/site-footer"

export default function SiteLayout({children}: {children: ReactNode}) {
    return (
        <div className="site-shell">
            <main id="main-content">{children}</main>
            <SiteFooter />
        </div>
    )
}
