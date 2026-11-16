import {versionInfo} from "@streamcat/core/version"
import "./site-footer.css"

export function SiteFooter() {
    return (
        <footer className="site-footer">
            <span title={versionInfo.builtAt ? `Build: ${versionInfo.builtAt}` : "Local development"}>
                Version {versionInfo.version.split("+")[0]}
            </span>
        </footer>
    )
}
