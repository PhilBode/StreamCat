import {appendFile, readFile, chmod} from "node:fs/promises"
import {resolve} from "node:path"

const root = resolve(import.meta.dir, "..")
const result = Bun.spawnSync(
    [
        "docker",
        "compose",
        "-f",
        "compose.yml",
        "-f",
        "compose.dev.yml",
        "run",
        "--rm",
        "--no-deps",
        "--entrypoint",
        "bun",
        "secrets",
        "-e",
        'process.stdout.write(await Bun.file("/var/lib/streamcat/secrets/secrets.json").text())'
    ],
    {cwd: root, stdout: "pipe", stderr: "pipe"}
)

if (result.exitCode !== 0) {
    console.error("[Secrets] Could not read installation secrets. Check the secrets container in Docker.")
    process.exit(1)
}

let secrets: unknown
try {
    secrets = JSON.parse(result.stdout.toString())
} catch {
    throw new Error("Invalid installation secrets file")
}
if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) throw new Error("Invalid installation secrets")
const envFile = resolve(root, ".env")
const existing = await readFile(envFile, "utf8")
const missing: string[] = []
for (const [name, value] of Object.entries(secrets)) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Invalid installation secret value")
    const configured = process.env[name]
    if (configured?.trim() && configured !== value)
        throw new Error(`${name} differs from the stored installation secret`)
    if (!configured?.trim()) missing.push(`${name}='${value.replaceAll("'", "\\'")}'`)
}
await chmod(envFile, 0o600)
if (missing.length) {
    await appendFile(
        envFile,
        `${existing.endsWith("\n") ? "" : "\n"}\n# Synced from the persistent installation secrets volume.\n${missing.join("\n")}\n`
    )
}
console.info(
    `[Secrets] Local .env ${missing.length ? "synced with" : "already matches"} persistent installation secrets`
)
