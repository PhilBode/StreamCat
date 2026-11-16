import {SiteHeader} from "@/components/layout/site-header"
import {Dashboard} from "@/components/dashboard/dashboard"

export default function DashboardPage() {
    return (
        <>
            <SiteHeader context={{path: "servers", label: "Meine Server"}} />
            <Dashboard />
        </>
    )
}
