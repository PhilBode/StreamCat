/** Diagnostic fields only: provider messages can contain tokens or callback URLs. */
export function errorDetails(error: unknown): string {
    if (!(error instanceof Error)) return "error_type=unknown"
    const fields = diagnosticFields(error, "error")
    const cause = error.cause instanceof Error ? error.cause : undefined
    if (cause && cause !== error) fields.push(...diagnosticFields(cause, "cause"))

    // Prefer the original failure location when a boundary wraps an error for the user.
    const source = cause ?? error
    const locations = source.stack
        ?.split("\n")
        .slice(1)
        .map((line) => line.match(/(?:\/|file:\/\/\/)[^\s()?]+\.[cm]?[jt]s:\d+:\d+/)?.[0])
        .filter((location): location is string => Boolean(location))
        .slice(0, 3)
    if (locations?.length) fields.push(`source=${locations.join(",")}`)
    return fields.join(" ")
}

function diagnosticFields(error: Error, prefix: "error" | "cause"): string[] {
    const type = /^[A-Za-z][A-Za-z0-9]*$/.test(error.name) ? error.name : "Error"
    const fields = [`${prefix}_type=${type}`]
    const code = (error as Error & {code?: unknown}).code
    if (typeof code === "number" || (typeof code === "string" && /^(P\d{4}|E[A-Z_]+|UND_ERR_[A-Z_]+)$/.test(code))) {
        fields.push(`${prefix}_code=${code}`)
    }
    const httpError = error as Error & {statusCode?: unknown; status?: unknown}
    const status = httpError.statusCode ?? httpError.status
    if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
        fields.push(`${prefix}_status=${status}`)
    }
    return fields
}
