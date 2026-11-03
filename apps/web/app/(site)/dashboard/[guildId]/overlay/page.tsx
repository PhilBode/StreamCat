import {OverlayEditor} from "@/components/overlay/editor"

export default async function OverlayPage({params}: {params: Promise<{guildId: string}>}) {
    const {guildId} = await params
    return <OverlayEditor key={guildId} guildId={guildId} />
}
