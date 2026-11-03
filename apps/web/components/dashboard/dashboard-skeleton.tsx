import {Skeleton} from "../ui/skeleton"

export function DashboardSkeleton({guildView}: {guildView: boolean}) {
    return (
        <div role="status" aria-label={guildView ? "Server wird geladen" : "Serverliste wird geladen"}>
            {guildView ? (
                <>
                    <div className="skeleton-back-link">
                        <Skeleton className="skeleton-caption" />
                    </div>
                    <div className="guild-summary" aria-hidden="true">
                        <div className="guild-header">
                            <Skeleton className="skeleton-avatar" />
                            <div className="skeleton-stack skeleton-guild-name">
                                <Skeleton className="skeleton-heading" />
                                <Skeleton className="skeleton-caption" />
                            </div>
                        </div>
                        <div className="stats">
                            {[0, 1].map((stat) => (
                                <div className="skeleton-stack" key={stat}>
                                    <Skeleton className="skeleton-caption" />
                                    <Skeleton className="skeleton-heading" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="connections" aria-hidden="true">
                        <div className="section-heading skeleton-stack">
                            <Skeleton className="skeleton-heading" />
                            <Skeleton className="skeleton-caption" />
                        </div>
                        <div className="connection-grid">
                            <ConnectionSkeleton />
                            <ConnectionSkeleton />
                        </div>
                    </div>
                </>
            ) : (
                <div className="guild-grid" aria-hidden="true">
                    {[0, 1, 2].map((row) => (
                        <div className="guild-card" key={row}>
                            <Skeleton />
                            <div className="guild-header skeleton-guild-name">
                                <Skeleton className="skeleton-avatar" />
                                <div className="skeleton-stack skeleton-guild-name">
                                    <Skeleton className="skeleton-heading" />
                                    <Skeleton className="skeleton-caption" />
                                </div>
                            </div>
                            <Skeleton className="skeleton-button" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function ConnectionSkeleton() {
    return (
        <div className="connection-card" aria-hidden="true">
            <div className="connection-heading">
                <Skeleton className="skeleton-avatar" />
                <div className="skeleton-stack">
                    <Skeleton className="skeleton-heading" />
                    <Skeleton className="skeleton-caption" />
                </div>
            </div>
            <div className="skeleton-stack">
                <Skeleton className="skeleton-caption" />
                <Skeleton className="skeleton-heading" />
                <Skeleton className="skeleton-text" />
            </div>
            <div className="connection-footer">
                <Skeleton className="skeleton-button" />
            </div>
        </div>
    )
}
