-- ══════════════════════════════════════════════════════════════════════
-- 20240024_pf16_expires_at
--
-- Agrega columna expires_at a pf16_evaluations para permitir
-- expiración basada en fecha además del campo status='expired'.
--
-- Problema (P1): los routes token/answer y token/submit solo verificaban
-- status === 'expired' (valor manual). Un token cuyo status nunca fue
-- actualizado a 'expired' podía usarse indefinidamente.
--
-- Solución:
--   • Columna expires_at TIMESTAMPTZ — fecha máxima de uso del token
--   • Por defecto: 7 días desde created_at para evaluaciones existentes
--   • Los API routes verifican expires_at en cada request
-- ══════════════════════════════════════════════════════════════════════

-- 1. Agregar columna expires_at (nullable = sin expiración por fecha)
ALTER TABLE public.pf16_evaluations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Backfill seguro: evaluaciones existentes con status != 'completed'/'expired'
--    reciben un expires_at = 7 días desde created_at (ya vencidas si son viejas)
--    No se modifica el status — la API mantendrá la lógica de auto-expiración.
UPDATE public.pf16_evaluations
  SET expires_at = created_at + INTERVAL '7 days'
  WHERE expires_at IS NULL
    AND status NOT IN ('completed', 'expired');

-- 3. Índice para queries de expiración en el API
CREATE INDEX IF NOT EXISTS idx_pf16_eval_expires
  ON public.pf16_evaluations (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN public.pf16_evaluations.expires_at IS
  'Fecha límite absoluta para el uso del token de evaluación. '
  'NULL = sin expiración por fecha. '
  'Los API routes verifican este campo además del campo status. '
  'Añadida en 20240024 para corregir el gap P1 de expiración solo por status.';
