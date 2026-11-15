import {Skeleton} from "../ui/skeleton"

export function EditorSkeleton() {
    return (
        <div role="status" aria-label="Overlay-Editor wird geladen" className="editor-skeleton">
            <div className="panel editor-skeleton-toolbar" aria-hidden="true">
                <Skeleton className="skeleton-control" />
                <Skeleton className="skeleton-button" />
                <Skeleton className="skeleton-button" />
            </div>
            <div className="overlay-workspace" aria-hidden="true">
                <div className="overlay-preview-section">
                    <div className="overlay-preview-heading">
                        <Skeleton className="skeleton-heading" />
                        <Skeleton className="skeleton-caption" />
                    </div>
                    <Skeleton className="editor-skeleton-canvas" />
                </div>
                <div className="panel overlay-sidebar skeleton-stack">
                    <Skeleton className="skeleton-heading" />
                    {[0, 1, 2, 3].map((field) => (
                        <Skeleton className="skeleton-control" key={field} />
                    ))}
                </div>
            </div>
        </div>
    )
}
