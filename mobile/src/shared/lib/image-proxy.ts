/**
 * Wraps a remote image URL with the public wsrv.nl proxy so we get:
 * - Server-side resize (huge bandwidth saving on mobile)
 * - Format normalization to jpg/webp (avoids broken WebP variants on iOS)
 * - Origin spoofing — many recipe CDNs block hotlinking without `Referer`
 *   from their own domain; wsrv presents itself as a regular browser
 *   and aggressively caches the result on Cloudflare.
 *
 * Returns `null` when the input is missing so callers can fall back to a
 * branded gradient placeholder instead of rendering a broken image icon.
 */
export type ImageProxyOptions = {
    width?: number
    height?: number
    quality?: number
    /** Pass-through for already-trusted hosts (own S3, wsrv, expo assets). */
    skipProxy?: boolean
}

const TRUSTED_HOSTS = new Set([
    'wsrv.nl',
    'images.weserv.nl',
    'mealplanner.kz',
    'static.mealplanner.kz',
    'expo.dev',
])

/**
 * Some upstream CDNs we ingest from are unreliable; rewrite to a sibling host
 * that serves the same paths reliably. Keep this list narrow — only rewrite
 * when we have verified identical path semantics.
 */
const HOST_REWRITES: Record<string, string> = {
    // russianfood.com's image subdomain has been returning 502 since spring '26;
    // the main domain serves the exact same /dycontent/images_upl/... paths.
    'img1.russianfood.com': 'www.russianfood.com',
    'img2.russianfood.com': 'www.russianfood.com',
}

function shouldSkipProxy(url: string): boolean {
    try {
        const parsed = new URL(url)
        if (TRUSTED_HOSTS.has(parsed.hostname)) return true
        if (parsed.protocol === 'data:' || parsed.protocol === 'file:') return true
        return false
    } catch {
        return true
    }
}

function rewriteOrigin(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl)
        const replacement = HOST_REWRITES[parsed.hostname]
        if (!replacement) return rawUrl
        parsed.hostname = replacement
        return parsed.toString()
    } catch {
        return rawUrl
    }
}

export function proxiedImageUrl(
    rawUrl: string | null | undefined,
    options: ImageProxyOptions = {},
): string | null {
    if (!rawUrl) return null
    const trimmed = rewriteOrigin(rawUrl.trim())
    if (!trimmed) return null
    if (options.skipProxy || shouldSkipProxy(trimmed)) return trimmed

    let stripped: string
    try {
        const parsed = new URL(trimmed)
        stripped = `${parsed.host}${parsed.pathname}${parsed.search}`
    } catch {
        return trimmed
    }

    const params = new URLSearchParams()
    params.set('url', stripped)
    if (options.width) params.set('w', String(options.width))
    if (options.height) params.set('h', String(options.height))
    if (options.width && options.height) params.set('fit', 'cover')
    params.set('q', String(options.quality ?? 80))
    params.set('output', 'jpg')

    return `https://wsrv.nl/?${params.toString()}`
}
