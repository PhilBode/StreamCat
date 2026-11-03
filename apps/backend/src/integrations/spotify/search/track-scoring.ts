export function findBestMatch<
    T extends {
        id: string
        name: string
        uri: string
        artists: Array<{name: string}>
    }
>(query: string, tracks: T[]): T {
    const queryWords = query.toLowerCase().trim().split(/\s+/).filter(Boolean)

    let bestMatch = tracks[0]
    let bestScore = -1

    for (const track of tracks) {
        const combined = `${track.artists.map((artist) => artist.name.toLowerCase()).join(" ")} ${track.name.toLowerCase()}`
        const matched = queryWords.filter((word) => combined.includes(word)).length
        const score = queryWords.length ? matched / queryWords.length : 0

        if (score > bestScore) {
            bestScore = score
            bestMatch = track
        }
    }
    return bestMatch
}
