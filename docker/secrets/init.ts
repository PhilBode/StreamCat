import {randomBytes} from "node:crypto"
import {access, chown, mkdir, readFile, rename, writeFile} from "node:fs/promises"

const directory = "/var/lib/streamcat/secrets"
const manifestPath = `${directory}/secrets.json`
const generators = {
    AUTH_SECRET: () => randomBytes(32).toString("hex"),
    EVENTSUB_SECRET: () => randomBytes(32).toString("hex"),
    DB_PASSWORD: () => randomBytes(32).toString("hex"),
    S3_ACCESS_KEY_ID: () => `GK${randomBytes(16).toString("hex")}`,
    S3_SECRET_ACCESS_KEY: () => randomBytes(32).toString("hex"),
    GARAGE_RPC_SECRET: () => randomBytes(32).toString("hex")
}

async function exists(path: string): Promise<boolean> {
    try {
        await access(path)
        return true
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false
        throw error
    }
}

async function save(path: string, contents: string): Promise<void> {
    await writeFile(`${path}.tmp`, contents, {mode: 0o600})
    await rename(`${path}.tmp`, path)
}

async function initialSecrets(): Promise<Record<string, string>> {
    const required: string[] = []
    if (await exists("/existing-postgres/18/docker/PG_VERSION")) {
        required.push("AUTH_SECRET", "EVENTSUB_SECRET", "DB_PASSWORD")
    }
    if (await exists("/existing-garage/node_key")) {
        required.push("S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "GARAGE_RPC_SECRET")
    }
    const missing = required.filter((name) => !process.env[name]?.trim())
    if (missing.length) {
        throw new Error(
            `Existing data requires its original secrets: ${missing.join(", ")}. Restore them before starting.`
        )
    }
    // A missing manifest with existing derived files is a damaged secrets volume, not a fresh install.
    for (const path of ["backend/environment.json", "garage/environment.json", "postgres/password"]) {
        if (await exists(`${directory}/${path}`))
            throw new Error("Secrets manifest is missing. Restore the secrets volume.")
    }
    return Object.fromEntries(
        Object.entries(generators).map(([name, generate]) => [
            name,
            process.env[name]?.trim() ? process.env[name]! : generate()
        ])
    )
}

try {
    await mkdir(directory, {recursive: true, mode: 0o700})
    const initialized = await exists(manifestPath)
    let secrets: unknown
    if (initialized) secrets = JSON.parse(await readFile(manifestPath, "utf8"))
    else secrets = await initialSecrets()
    if (!secrets || typeof secrets !== "object") throw new Error("Invalid stored secrets. Restore the secrets volume.")
    const stored = secrets as Record<string, unknown>
    for (const name of Object.keys(generators)) {
        if (typeof stored[name] !== "string" || !stored[name].trim())
            throw new Error(`Missing stored ${name}. Restore the secrets volume.`)
        const supplied = process.env[name]
        if (supplied?.trim() && supplied !== stored[name])
            throw new Error(
                `${name} differs from the stored value. Restore the original configuration or rotate it deliberately.`
            )
    }
    if (!/^[a-f0-9]{64}$/i.test(String(stored.GARAGE_RPC_SECRET))) throw new Error("Invalid stored GARAGE_RPC_SECRET.")
    if (!initialized) await save(manifestPath, JSON.stringify(stored))
    for (const name of ["backend", "garage", "postgres"]) {
        await mkdir(`${directory}/${name}`, {recursive: true, mode: 0o700})
    }
    const {GARAGE_RPC_SECRET, ...backend} = stored
    await save(`${directory}/backend/environment.json`, JSON.stringify(backend))
    // The backend runs as the image's bun user; keep its secrets private to that UID.
    await chown(`${directory}/backend`, 1000, 1000)
    await chown(`${directory}/backend/environment.json`, 1000, 1000)
    await save(
        `${directory}/garage/environment.json`,
        JSON.stringify({
            GARAGE_DEFAULT_ACCESS_KEY: stored.S3_ACCESS_KEY_ID,
            GARAGE_DEFAULT_SECRET_KEY: stored.S3_SECRET_ACCESS_KEY
        })
    )
    await save(`${directory}/garage/rpc-secret`, String(GARAGE_RPC_SECRET))
    await save(`${directory}/postgres/password`, String(stored.DB_PASSWORD))
    console.info(`[Secrets] ${initialized ? "Reusing" : "Created"} persistent installation secrets`)
} catch (error) {
    const reason =
        error instanceof SyntaxError
            ? "Invalid stored JSON. Restore the secrets volume."
            : error instanceof Error
              ? error.message
              : "Unknown setup error"
    console.error(`[Secrets] Setup failed: ${reason}`)
    process.exit(1)
}
