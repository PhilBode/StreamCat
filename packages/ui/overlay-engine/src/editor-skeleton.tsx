import {Skeleton} from "./internal/skeleton"

export function EditorSkeleton() {
    return (
        <div role="status" aria-label="Overlay-Editor wird geladen" className="editor-skeleton">
            <div className="overlay-scene-bar" aria-hidden="true">
                <div className="overlay-scene-bar-left">
                    <Skeleton className="overlay-skeleton-control" />
                    <Skeleton className="overlay-skeleton-button" />
                    <Skeleton className="overlay-skeleton-button" />
                </div>
                <div className="overlay-scene-bar-right">
                    <Skeleton className="overlay-skeleton-button" />
                    <Skeleton className="overlay-skeleton-button" />
                </div>
            </div>
            <div className="overlay-workspace" aria-hidden="true">
                <div className="overlay-preview-section">
                    <Skeleton className="editor-skeleton-canvas" />
                </div>
                <div className="overlay-sidebar overlay-skeleton-stack">
                    <Skeleton className="overlay-skeleton-control" />
                    {[0, 1, 2, 3].map((field) => (
                        <Skeleton className="overlay-skeleton-control" key={field} />
                    ))}
                </div>
            </div>
        </div>
    )
}
