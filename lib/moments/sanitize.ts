/**
 * lib/moments/sanitize.ts
 * Sanitización de contenido textual para prevenir XSS almacenado.
 *
 * Política: texto plano únicamente — todos los tags HTML son eliminados.
 * El contenido se almacena limpio; no se re-sanitiza al leer.
 */

// Patrones a eliminar (defensa en profundidad después de strip de tags)
const XSS_PATTERNS: RegExp[] = [
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\s*\/\s*html/gi,
  /on\w+\s*=/gi,   // onclick=, onload=, onerror=, …
  /<!\[CDATA\[/gi,
]

/**
 * Elimina todos los tags HTML y patrones XSS.
 * Preserva el texto y saltos de línea; no codifica entidades.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''

  // 1. Eliminar bloques completos de tags peligrosos (tag + contenido + cierre)
  //    Orden importante: scripts primero, luego los demás
  let clean = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')

  // 2. Eliminar todos los tags HTML restantes (apertura y cierre)
  clean = clean.replace(/<[^>]*>/g, '')

  // 2. Eliminar patrones peligrosos residuales
  for (const re of XSS_PATTERNS) {
    clean = clean.replace(re, '')
  }

  // 3. Colapsar saltos de línea excesivos (máx 3 consecutivos)
  clean = clean.replace(/\n{4,}/g, '\n\n\n')

  return clean.trim()
}

/**
 * Sanitiza un título: texto plano, una sola línea.
 */
export function sanitizeTitle(input: string, maxLen = 200): string {
  return sanitizeText(input)
    .replace(/[\r\n\t]+/g, ' ')   // colapsar whitespace interno
    .replace(/\s{2,}/g, ' ')      // eliminar espacios dobles
    .slice(0, maxLen)
    .trim()
}
