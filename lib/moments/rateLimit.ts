/**
 * lib/moments/rateLimit.ts
 * Rate limiting en memoria con ventana deslizante.
 *
 * Adecuado para entornos de proceso único (Next.js dev, single container).
 * Para multi-instancia (Vercel, etc.) reemplazar con Redis o un contador en BD.
 *
 * Diseño:
 * - Clave: `${userId}:${action}`
 * - Ventana: timestamps del último N milisegundos
 * - Limpieza automática de entradas antiguas para evitar memory leaks
 */
import { ConflictError } from '@/lib/moments/errors'

// ── Configuración de límites ──────────────────────────────────────────
const LIMITS = {
  post:     { maxCount: 10, windowMs: 60 * 60_000 },   // 10 posts/hora
  comment:  { maxCount: 30, windowMs: 60 * 60_000 },   // 30 comentarios/hora
  reaction: { maxCount: 60, windowMs: 10 * 60_000 },   // 60 reacciones/10 min
} as const

export type RateLimitAction = keyof typeof LIMITS

// ── Store en memoria ──────────────────────────────────────────────────
const store = new Map<string, number[]>()

// Limpiar entradas completamente vacías cada 5 minutos para prevenir leak
let lastCleanup = Date.now()
function maybeCleanup(now: number) {
  if (now - lastCleanup < 5 * 60_000) return
  lastCleanup = now
  Array.from(store.entries()).forEach(([key, timestamps]) => {
    if (timestamps.length === 0) store.delete(key)
  })
}

// ── Función pública ───────────────────────────────────────────────────

/**
 * Verifica y registra un intento. Lanza ConflictError si se excede el límite.
 * Si la verificación pasa, el intento queda registrado.
 *
 * @throws {ConflictError} código RATE_LIMIT_EXCEEDED
 */
export function checkRateLimit(userId: string, action: RateLimitAction): void {
  const { maxCount, windowMs } = LIMITS[action]
  const key = `${userId}:${action}`
  const now = Date.now()

  maybeCleanup(now)

  // Obtener o crear el array de timestamps
  const timestamps = store.get(key) ?? []

  // Deslizar la ventana: eliminar timestamps fuera del rango
  const cutoff  = now - windowMs
  const inWindow = timestamps.filter(ts => ts > cutoff)

  if (inWindow.length >= maxCount) {
    const oldest       = inWindow[0]
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000)
    throw new ConflictError(
      `Límite de solicitudes alcanzado para "${action}". Intenta de nuevo en ${retryAfterSec}s`,
      'RATE_LIMIT_EXCEEDED',
    )
  }

  // Registrar el nuevo intento
  inWindow.push(now)
  store.set(key, inWindow)
}

/**
 * Revierte el último intento registrado (útil si la operación falla).
 * Llamar solo cuando la operación principal lanzó un error.
 */
export function rollbackRateLimit(userId: string, action: RateLimitAction): void {
  const key = `${userId}:${action}`
  const timestamps = store.get(key)
  if (timestamps && timestamps.length > 0) {
    timestamps.pop()
  }
}

/** Solo para tests: resetea el store */
export function _resetStore(): void {
  store.clear()
}
