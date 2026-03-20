'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

interface OrganizationState {
  organizationId: string | null
  role: UserRole | null
  userId: string | null
  loading: boolean
  error: string | null
}

export function useOrganization(): OrganizationState {
  const [state, setState] = useState<OrganizationState>({
    organizationId: null,
    role: null,
    userId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        setState({ organizationId: null, role: null, userId: null, loading: false, error: authError?.message ?? null })
        return
      }

      const { data: membership, error: memberError } = await supabase
        .from('user_memberships')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .or('valid_until.is.null,valid_until.gt.' + new Date().toISOString())
        .limit(1)
        .single()

      if (memberError || !membership) {
        setState({ organizationId: null, role: null, userId: user.id, loading: false, error: 'No active membership' })
        return
      }

      setState({
        organizationId: membership.organization_id,
        role: membership.role as UserRole,
        userId: user.id,
        loading: false,
        error: null,
      })
    }

    load()
  }, [])

  return state
}
