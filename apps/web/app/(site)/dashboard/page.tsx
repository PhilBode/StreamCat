import {SiteHeader} from "@/components/layout/site-header"
import {Servers} from "@/components/dashboard/servers"

export default function DashboardPage() {
    return (
        <>
            <SiteHeader context={{path: "servers", label: "Meine Server"}} />
            <Servers />
        </>
    )
}
