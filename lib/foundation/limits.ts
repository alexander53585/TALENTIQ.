/* ═══════════════════════════════════════════════════
 * Límites cuantitativos por tamaño de organización
 * Basados en mejores prácticas de planeación estratégica
 * ═══════════════════════════════════════════════════ */

export interface FoundationLimits {
  valores:      [number, number]   // [min, max] Valores declarados
  cardinales:   [number, number]   // [min, max] Competencias cardinales
  ejes:         [number, number]   // [min, max] Ejes estratégicos
  procesos:     [number, number]   // [min, max] Procesos críticos
  prioridades:  [number, number]   // [min, max] Prioridades del período
}

type SizeCategory = 'small' | 'medium' | 'large'

const LIMITS: Record<SizeCategory, FoundationLimits> = {
  small:  { valores: [2, 5], cardinales: [3, 5], ejes: [1, 3], procesos: [2, 5],  prioridades: [1, 3] },
  medium: { valores: [3, 7], cardinales: [3, 7], ejes: [2, 4], procesos: [3, 7],  prioridades: [2, 5] },
  large:  { valores: [3, 7], cardinales: [5, 7], ejes: [3, 5], procesos: [5, 10], prioridades: [3, 5] },
}

export function getSizeCategory(size: string): SizeCategory {
  if (!size) return 'medium'
  if (size.startsWith('Autónomo') || size.startsWith('2–10')) return 'small'
  if (size.startsWith('11–50')) return 'medium'
  return 'large' // 51–200, 201–500, 501–1000, +1000
}

export function getLimits(size: string): FoundationLimits {
  return LIMITS[getSizeCategory(size)]
}

/** Etiqueta legible del tamaño para el prompt de IA */
export function getSizeLabel(size: string): string {
  const cat = getSizeCategory(size)
  return { small: '1–20 empleados', medium: '21–100 empleados', large: '100+ empleados' }[cat]
}
