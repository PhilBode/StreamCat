import type {HTMLAttributes} from "react"
import "./skeleton.css"

export function Skeleton({className, ...props}: HTMLAttributes<HTMLSpanElement>) {
    return <span className={["skeleton", className].filter(Boolean).join(" ")} aria-hidden="true" {...props} />
}
