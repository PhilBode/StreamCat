import {backendUrl as backend} from "@/lib/backend"

// Stream media through a small boundary so proxy errors never print signed URLs.
export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
    const path = (await params).path
    const [sceneId, assetId, signature] = path
    if (
        path.length !== 3 ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(sceneId) ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(assetId) ||
        !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return new Response(null, {status: 404, headers: {"Cache-Control": "private, no-store"}})
    }
    const headers = new Headers()
    const range = request.headers.get("Range")
    if (range) headers.set("Range", range)
    try {
        const response = await fetch(`${backend}/overlays/assets/${sceneId}/${assetId}/${signature}`, {
            headers,
            cache: "no-store",
            signal: request.signal
        })
        const forwarded = new Headers({"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"})
        for (const name of [
            "Content-Type",
            "Content-Length",
            "Content-Range",
            "Accept-Ranges",
            "Content-Disposition",
            "Content-Security-Policy",
            "X-Content-Type-Options"
        ]) {
            const value = response.headers.get(name)
            if (value) forwarded.set(name, value)
        }
        return new Response(response.body, {status: response.status, headers: forwarded})
    } catch {
        if (request.signal.aborted) return new Response(null, {status: 499})
        console.error(`[OverlayAssets] Media proxy failed scene=${sceneId} asset=${assetId}`)
        return new Response(null, {status: 502, headers: {"Cache-Control": "private, no-store"}})
    }
}
