/**
 * lib/moments/permissions.ts
 * Funciones puras de control de acceso para Moments.
 *
 * Diseño:
 * - Sin dependencias de BD — reciben el rol y devuelven boolean
 * - Testeables de forma determinista sin mocks
 * - Basadas en el modelo de roles: owner > admin > hr_specialist > manager > employee
 *
 * Roles con privilegios de moderación: owner, admin, hr_specialist
 * Roles con acceso básico: manager, employee
 */
import type { OrgRole } from '@/lib/auth/requestContext'

// ── Helpers internos ──────────────────────────────────────────────────

const ADMIN_ROLES   = new Set<OrgRole>(['owner', 'admin', 'hr_specialist'])
const MANAGER_ROLES = new Set<OrgRole>(['owner', 'admin', 'hr_specialist', 'manager'])

export function isAdmin(role: OrgRole): boolean {
  return ADMIN_ROLES.has(role)
}

export function isManagerOrAbove(role: OrgRole): boolean {
  return MANAGER_ROLES.has(role)
}

// ── Comunidades ────────────────────────────────────────────────────────

/**
 * ¿Puede crear una nueva comunidad?
 * Solo admins y hr_specialist (no managers ni employees directamente).
 */
export function canCreateCommunity(role: OrgRole): boolean {
  return isAdmin(role)
}

/**
 * ¿Puede moderar una comunidad (editar, archivar, cambiar políticas)?
 * Solo admins.
 */
export function canModerateCommunity(role: OrgRole): boolean {
  return isAdmin(role)
}

/**
 * ¿Puede eliminar una comunidad?
 * Solo owner y admin (no hr_specialist).
 */
export function canDeleteCommunity(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

// ── Posts ──────────────────────────────────────────────────────────────

/** Matches moments_communities.posting_policy CHECK constraint in DB */
export type PostingPolicy = 'all_members' | 'admins_only'

/**
 * ¿Puede publicar en una comunidad dado su política de publicación?
 * - all_members: cualquier miembro activo
 * - admins_only: solo roles admin
 */
export function canPostInCommunity(
  role:   OrgRole,
  policy: PostingPolicy,
): boolean {
  if (policy === 'admins_only') return isAdmin(role)
  return true  // all_members → cualquier rol activo puede postear
}

/**
 * ¿Puede destacar (feature) un post?
 * Solo admins.
 */
export function canFeaturePost(role: OrgRole): boolean {
  return isAdmin(role)
}

/**
 * ¿Puede bloquear/desbloquear un post?
 * Solo admins.
 */
export function canLockPost(role: OrgRole): boolean {
  return isAdmin(role)
}

/**
 * ¿Puede eliminar un post que no es suyo?
 * Solo admins.
 */
export function canDeleteAnyPost(role: OrgRole): boolean {
  return isAdmin(role)
}

/**
 * ¿Puede editar/eliminar su propio post?
 * Cualquier rol puede editar su propio contenido.
 */
export function canEditOwnPost(): boolean {
  return true
}

// ── Comentarios ────────────────────────────────────────────────────────

/**
 * ¿Puede comentar en un post?
 * Cualquier miembro, salvo si el post está bloqueado.
 * (El guard de is_locked se verifica en la API, no aquí.)
 */
export function canComment(_role: OrgRole): boolean {
  return true
}

/**
 * ¿Puede eliminar un comentario que no es suyo?
 * Solo admins.
 */
export function canDeleteAnyComment(role: OrgRole): boolean {
  return isAdmin(role)
}

// ── Reportes ───────────────────────────────────────────────────────────

/**
 * ¿Puede reportar contenido?
 * Cualquier miembro puede reportar.
 */
export function canReport(_role: OrgRole): boolean {
  return true
}

/**
 * ¿Puede ver/gestionar reportes?
 * Solo admins.
 */
export function canManageReports(role: OrgRole): boolean {
  return isAdmin(role)
}

// ── Reacciones ─────────────────────────────────────────────────────────

/**
 * ¿Puede reaccionar a contenido?
 * Cualquier miembro puede reaccionar.
 */
export function canReact(_role: OrgRole): boolean {
  return true
}

// ── Adjuntos ───────────────────────────────────────────────────────────

/**
 * ¿Puede subir adjuntos a un post?
 * Cualquier miembro que pueda postear.
 * (La política de la comunidad se evalúa con canPostInCommunity.)
 */
export function canUploadAttachment(_role: OrgRole): boolean {
  return true
}

/**
 * ¿Puede eliminar un adjunto que no es suyo?
 * Solo admins.
 */
export function canDeleteAnyAttachment(role: OrgRole): boolean {
  return isAdmin(role)
}
