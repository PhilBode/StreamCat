import {headers} from "next/headers"
import {SiteHeader} from "@/components/layout/site-header"
import {Dashboard} from "@/components/dashboard/dashboard"
import {backendUrl} from "../../../../lib/backend"

async function guildName(guildId: string): Promise<string | null> {
    const cookie = (await headers()).get("cookie")
    if (!cookie) return null
    try {
        const response = await fetch(`${backendUrl}/dashboard/guilds/${encodeURIComponent(guildId)}`, {
            headers: {cookie},
            cache: "no-store",
            signal: AbortSignal.timeout(5000)
        })
        if (!response.ok) return null
        const guild = (await response.json()) as {name?: string}
        return guild.name || null
    } catch {
        return null
    }
}

export default async function GuildPage({params}: {params: Promise<{guildId: string}>}) {
    const {guildId} = await params
    const name = await guildName(guildId)
    return (
        <>
            <SiteHeader context={{path: "dashboard", label: name ? `Meine Server / ${name}` : "Meine Server"}} />
            <Dashboard key={guildId} guildId={guildId} />
        </>
    )
}
