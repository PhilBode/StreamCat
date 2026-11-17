import Link from "next/link"
import {headers} from "next/headers"
import type {DashboardUser} from "@streamcat/interfaces"
import {backendUrl} from "../../lib/backend"
import {ProfileMenu} from "./profile-menu"
import "./site-header.css"

type HeaderContext = {
    path: string
    label: string
}

async function sessionUser(): Promise<DashboardUser | null> {
    const cookie = (await headers()).get("cookie")
    if (!cookie) return null
    try {
        const response = await fetch(`${backendUrl}/dashboard/me`, {
            headers: {cookie},
            cache: "no-store",
            signal: AbortSignal.timeout(5000)
        })
        if (!response.ok) return null
        return (await response.json()) as DashboardUser
    } catch {
        return null
    }
}

export async function SiteHeader({context}: {context: HeaderContext}) {
    const user = await sessionUser()
    return (
        <header className="site-header">
            <div className="site-header-brand">
                <Link className="site-header-brand-link" href="/dashboard">
                    <span className="site-header-logo" aria-hidden="true">
                        ᓚ₍ ^. .^₎
                    </span>
                    <span className="site-header-name">StreamCat</span>
                    <span className="site-header-separator" aria-hidden="true">
                        /
                    </span>
                    <span className="site-header-path">{context.path}</span>
                </Link>
                <span className="site-header-rule" aria-hidden="true" />
                <span className="site-header-label">{context.label}</span>
            </div>
            <div className="site-header-right">
                {user ? (
                    <ProfileMenu
                        name={user.name}
                        avatarSrc={
                            user.avatar
                                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
                                : null
                        }
                    />
                ) : (
                    <a className="site-header-login" href="/api/backend/dashboard/auth/login">
                        Anmelden
                    </a>
                )}
            </div>
        </header>
    )
}
