/**
 * Tests unitarios para lib/moments/permissions.ts
 * Verifica el control de acceso por rol sin llamadas a BD.
 */
import { describe, it, expect } from 'vitest'
import type { OrgRole } from '@/lib/auth/requestContext'
import {
  isAdmin,
  isManagerOrAbove,
  canCreateCommunity,
  canModerateCommunity,
  canDeleteCommunity,
  canPostInCommunity,
  canFeaturePost,
  canLockPost,
  canDeleteAnyPost,
  canEditOwnPost,
  canComment,
  canDeleteAnyComment,
  canReport,
  canManageReports,
  canReact,
  canUploadAttachment,
  canDeleteAnyAttachment,
} from '../permissions'

const ALL_ROLES: OrgRole[] = ['owner', 'admin', 'hr_specialist', 'manager', 'employee']
const ADMIN_ROLES: OrgRole[] = ['owner', 'admin', 'hr_specialist']
const NON_ADMIN_ROLES: OrgRole[] = ['manager', 'employee']

describe('isAdmin', () => {
  it('returns true for admin roles', () => {
    ADMIN_ROLES.forEach(r => expect(isAdmin(r)).toBe(true))
  })
  it('returns false for non-admin roles', () => {
    NON_ADMIN_ROLES.forEach(r => expect(isAdmin(r)).toBe(false))
  })
})

describe('isManagerOrAbove', () => {
  it('returns true for admin roles and manager', () => {
    ;[...ADMIN_ROLES, 'manager' as OrgRole].forEach(r =>
      expect(isManagerOrAbove(r)).toBe(true),
    )
  })
  it('returns false for employee', () => {
    expect(isManagerOrAbove('employee')).toBe(false)
  })
})

describe('canCreateCommunity', () => {
  it('allows admin roles', () => {
    ADMIN_ROLES.forEach(r => expect(canCreateCommunity(r)).toBe(true))
  })
  it('blocks non-admin roles', () => {
    NON_ADMIN_ROLES.forEach(r => expect(canCreateCommunity(r)).toBe(false))
  })
})

describe('canModerateCommunity', () => {
  it('allows admin roles', () => {
    ADMIN_ROLES.forEach(r => expect(canModerateCommunity(r)).toBe(true))
  })
  it('blocks non-admin roles', () => {
    NON_ADMIN_ROLES.forEach(r => expect(canModerateCommunity(r)).toBe(false))
  })
})

describe('canDeleteCommunity', () => {
  it('allows owner and admin', () => {
    expect(canDeleteCommunity('owner')).toBe(true)
    expect(canDeleteCommunity('admin')).toBe(true)
  })
  it('blocks hr_specialist, manager, employee', () => {
    ;(['hr_specialist', 'manager', 'employee'] as OrgRole[]).forEach(r =>
      expect(canDeleteCommunity(r)).toBe(false),
    )
  })
})

describe('canPostInCommunity', () => {
  it('open policy — all roles can post', () => {
    ALL_ROLES.forEach(r => expect(canPostInCommunity(r, 'open')).toBe(true))
  })
  it('members_only policy — all roles can post', () => {
    ALL_ROLES.forEach(r => expect(canPostInCommunity(r, 'members_only')).toBe(true))
  })
  it('admins_only policy — only admin roles can post', () => {
    ADMIN_ROLES.forEach(r => expect(canPostInCommunity(r, 'admins_only')).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canPostInCommunity(r, 'admins_only')).toBe(false))
  })
})

describe('canFeaturePost', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canFeaturePost(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canFeaturePost(r)).toBe(false))
  })
})

describe('canLockPost', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canLockPost(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canLockPost(r)).toBe(false))
  })
})

describe('canDeleteAnyPost', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canDeleteAnyPost(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canDeleteAnyPost(r)).toBe(false))
  })
})

describe('canEditOwnPost', () => {
  it('always returns true', () => {
    expect(canEditOwnPost()).toBe(true)
  })
})

describe('canComment', () => {
  it('all roles can comment', () => {
    ALL_ROLES.forEach(r => expect(canComment(r)).toBe(true))
  })
})

describe('canDeleteAnyComment', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canDeleteAnyComment(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canDeleteAnyComment(r)).toBe(false))
  })
})

describe('canReport', () => {
  it('all roles can report', () => {
    ALL_ROLES.forEach(r => expect(canReport(r)).toBe(true))
  })
})

describe('canManageReports', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canManageReports(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canManageReports(r)).toBe(false))
  })
})

describe('canReact', () => {
  it('all roles can react', () => {
    ALL_ROLES.forEach(r => expect(canReact(r)).toBe(true))
  })
})

describe('canUploadAttachment', () => {
  it('all roles can upload', () => {
    ALL_ROLES.forEach(r => expect(canUploadAttachment(r)).toBe(true))
  })
})

describe('canDeleteAnyAttachment', () => {
  it('allows admin roles only', () => {
    ADMIN_ROLES.forEach(r => expect(canDeleteAnyAttachment(r)).toBe(true))
    NON_ADMIN_ROLES.forEach(r => expect(canDeleteAnyAttachment(r)).toBe(false))
  })
})
