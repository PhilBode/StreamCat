export function expiresAtFromNow(expiresInSeconds: number): Date {
    return new Date(Date.now() + expiresInSeconds * 1000)
}

export function expiresInSeconds(expiresAt: Date): number {
    return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
}
