/**
 * lib/moments/errors.ts
 * Jerarquía de errores tipados para la API de Moments.
 * Permite respuestas HTTP homogéneas y seguras desde cualquier capa.
 */
import { NextResponse } from 'next/server'

// ── Clases de error ──────────────────────────────────────────────────

export class MomentsError extends Error {
  constructor(
    message: string,
    public readonly code:   string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'MomentsError'
  }
}

/** 401 — No hay sesión activa */
export class NotAuthenticatedError extends MomentsError {
  constructor(message = 'No autenticado') {
    super(message, 'NOT_AUTHENTICATED', 401)
    this.name = 'NotAuthenticatedError'
  }
}

/** 403 — Autenticado pero sin permiso */
export class ForbiddenError extends MomentsError {
  constructor(message = 'Acceso denegado') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * 404 — Recurso no encontrado O pertenece a otra org.
 * Siempre devolver 404 (nunca 403) para evitar enumeración cross-tenant.
 */
export class NotFoundError extends MomentsError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/** 422 — Payload inválido */
export class ValidationError extends MomentsError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 422)
    this.name = 'ValidationError'
  }
}

/** 409 — Conflicto de estado (post bloqueado, límite alcanzado, etc.) */
export class ConflictError extends MomentsError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, code, 409)
    this.name = 'ConflictError'
  }
}

// ── Convertidor a NextResponse ────────────────────────────────────────

/**
 * Convierte cualquier error a una NextResponse JSON segura.
 * - Errores MomentsError → código HTTP correcto + mensaje del error
 * - Errores inesperados → 500 genérico (nunca exponer stack)
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof MomentsError) {
    const body: Record<string, unknown> = { error: err.message, code: err.code }
    if (err instanceof ValidationError && err.field) {
      body.field = err.field
    }
    return NextResponse.json(body, { status: err.status })
  }

  // Error inesperado — loguear pero no exponer detalles
  console.error('[Moments API] Unexpected error:', err)
  return NextResponse.json(
    { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
    { status: 500 },
  )
}
