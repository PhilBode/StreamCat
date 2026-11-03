import {requireEnv} from "./env"

/** Docker supplies its internal address; local Bun and Prisma use the published port. */
export function databaseUrl(): string {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL
    const url = new URL("postgresql://localhost/streamcat")
    url.hostname = process.env.DB_HOST || "127.0.0.1"
    url.port = process.env.DB_PORT || "5432"
    url.username = encodeURIComponent(process.env.DB_USER || "streamcat")
    url.password = encodeURIComponent(requireEnv("DB_PASSWORD"))
    url.pathname = `/${encodeURIComponent(process.env.DB_NAME || "streamcat")}`
    return url.toString()
}
