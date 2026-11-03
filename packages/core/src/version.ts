import metadata from "./version.generated.json"

export const versionInfo: {version: string; builtAt: string | null} = metadata
export const versionLabel = `StreamCat v${versionInfo.version}`
