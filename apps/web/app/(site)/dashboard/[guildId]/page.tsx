import {headers} from "next/headers"
import {spotifyCallbackUrl} from "@streamcat/core/config"
import {SiteHeader} from "@/components/layout/site-header"
import {Guild} from "@/components/dashboard/guild"
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

export default async function GuildPage({
    params,
    searchParams
}: {
    params: Promise<{guildId: string}>
    searchParams: Promise<{result?: string}>
}) {
    const [{guildId}, query] = await Promise.all([params, searchParams])
    const name = await guildName(guildId)
    const spotifyRedirectUri = process.env.PUBLIC_URL?.trim() ? spotifyCallbackUrl() : null
    return (
        <>
            <SiteHeader context={{path: "dashboard", label: name ? `Meine Server / ${name}` : "Meine Server"}} />
            <Guild
                key={guildId}
                guildId={guildId}
                oauthResult={query.result ?? null}
                spotifyRedirectUri={spotifyRedirectUri}
            />
        </>
    )
}
