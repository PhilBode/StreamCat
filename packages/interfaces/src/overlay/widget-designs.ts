export type WidgetDesignId = string

export function isWidgetDesignId(value: unknown): value is WidgetDesignId {
    return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(value)
}
