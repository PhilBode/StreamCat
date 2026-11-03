import {Dashboard} from "@/components/dashboard/dashboard"

export default async function GuildPage({params}: {params: Promise<{guildId: string}>}) {
    const {guildId} = await params
    return <Dashboard key={guildId} guildId={guildId} />
}
