/**
 * lib/rateLimit.ts
 * Rate limiting por IP para endpoints públicos.
 * Implementación en memoria con ventana deslizante.
 *
 * Limitaciones:
 * - No persiste entre reinicios de proceso
 * - No comparte estado entre instancias (multi-pod → usar Redis)
 * - Adecuado para single-instance (Next.js dev, single container, Vercel serverless por instancia)
 *
 * Para multi-instancia: reemplazar con Upstash Redis o @vercel/kv
 */

const store = new Map<string, number[]>()
let lastCleanup = Date.now()

function maybeCleanup(now: number) {
  if (now - lastCleanup < 5 * 60_000) return
  lastCleanup = now
  for (const [key, timestamps] of Array.from(store.entries())) {
    if (timestamps.length === 0) store.delete(key)
  }
}

interface RateLimitOptions {
  /** Máximo de requests por ventana */
  maxRequests: number
  /** Ventana en milisegundos */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  /** Tiempo en segundos hasta que se puede reintentar (si blocked) */
  retryAfterSec?: number
}

/**
 * Verifica rate limit por clave (generalmente IP + ruta).
 * No lanza excepciones — devuelve resultado que el handler decide cómo usar.
 */
export function checkPublicRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const { maxRequests, windowMs } = options
  const now = Date.now()
  maybeCleanup(now)

  const timestamps = store.get(key) ?? []
  const cutoff = now - windowMs
  const inWindow = timestamps.filter(ts => ts > cutoff)

  if (inWindow.length >= maxRequests) {
    const oldest = inWindow[0]!
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  inWindow.push(now)
  store.set(key, inWindow)
  return { allowed: true }
}

/** Solo para tests — resetea el store */
export function _resetPublicRateLimitStore(): void {
  store.clear()
}
