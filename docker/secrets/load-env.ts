import {readFileSync} from "node:fs"

try {
    const path = process.env.SECRETS_FILE
    if (!path) throw new Error("SECRETS_FILE is not configured")
    const secrets: unknown = JSON.parse(readFileSync(path, "utf8"))
    if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) throw new Error("Invalid secrets file")
    const environment = {...process.env}
    for (const [name, value] of Object.entries(secrets)) {
        if (typeof value !== "string" || !value.trim()) throw new Error("Invalid secret value")
        environment[name] = value
    }
    const [command, ...args] = process.argv.slice(2)
    const executable = command && Bun.which(command)
    if (!executable) throw new Error("Container startup command was not found")
    process.execve(executable, [executable, ...args], environment)
} catch {
    console.error("[Secrets] Cannot start container. Check the secrets volume and startup command.")
    process.exit(1)
}
