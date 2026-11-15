export function Skeleton({className = ""}: {className?: string}) {
    return <span className={`overlay-skeleton ${className}`} aria-hidden="true" />
}
