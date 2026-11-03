import {existsSync, writeFileSync} from "node:fs"
import {version} from "../package.json"

const target = new URL("../packages/core/src/version.generated.json", import.meta.url)
const development = process.argv.includes("--if-missing")

if (!development || !existsSync(target)) {
    const builtAt = new Date().toISOString()
    const stamp = builtAt.replace(/\D/g, "")
    const build = {
        version: development ? `${version}-dev.local` : `${version}+${stamp.slice(0, 8)}.${stamp.slice(8)}`,
        builtAt: development ? null : builtAt
    }
    writeFileSync(target, JSON.stringify(build, null, 2) + "\n")
    console.log(`StreamCat v${build.version}`)
}
