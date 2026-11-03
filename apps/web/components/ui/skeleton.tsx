import "./skeleton.css"

export function Skeleton({className = ""}: {className?: string}) {
    return <span className={`skeleton ${className}`} aria-hidden="true" />
}

export function SkeletonList({label, className = ""}: {label: string; className?: string}) {
    return (
        <div className={`skeleton-list ${className}`} role="status" aria-label={label}>
            {[0, 1, 2].map((row) => (
                <div className="skeleton-list-row" key={row} aria-hidden="true">
                    <Skeleton className="skeleton-avatar" />
                    <div className="skeleton-stack">
                        <Skeleton className="skeleton-text" />
                        <Skeleton className="skeleton-text-short" />
                    </div>
                </div>
            ))}
        </div>
    )
}
