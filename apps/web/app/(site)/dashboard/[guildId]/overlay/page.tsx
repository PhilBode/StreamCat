import {OverlayEditorClient} from "@/components/overlay/editor-client"

export default async function OverlayPage({params}: {params: Promise<{guildId: string}>}) {
    const {guildId} = await params
    return (
        <OverlayEditorClient
            key={guildId}
            basePath={`/dashboard/guilds/${encodeURIComponent(guildId)}/overlay`}
            backHref={`/dashboard/${encodeURIComponent(guildId)}`}
            loginHref="/api/backend/dashboard/auth/login"
        />
    )
}
