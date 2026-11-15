import {Skeleton} from "./internal/skeleton"

export function EditorSkeleton() {
    return (
        <div role="status" aria-label="Overlay-Editor wird geladen" className="editor-skeleton">
            <div className="panel editor-skeleton-toolbar" aria-hidden="true">
                <Skeleton className="overlay-skeleton-control" />
                <Skeleton className="overlay-skeleton-button" />
                <Skeleton className="overlay-skeleton-button" />
            </div>
            <div className="overlay-workspace" aria-hidden="true">
                <div className="overlay-preview-section">
                    <div className="overlay-preview-heading">
                        <Skeleton className="overlay-skeleton-heading" />
                        <Skeleton className="overlay-skeleton-caption" />
                    </div>
                    <Skeleton className="editor-skeleton-canvas" />
                </div>
                <div className="panel overlay-sidebar overlay-skeleton-stack">
                    <Skeleton className="overlay-skeleton-heading" />
                    {[0, 1, 2, 3].map((field) => (
                        <Skeleton className="overlay-skeleton-control" key={field} />
                    ))}
                </div>
            </div>
        </div>
    )
}
