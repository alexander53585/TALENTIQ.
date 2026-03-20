export type UserRole = 'owner' | 'admin' | 'hr_specialist' | 'manager' | 'employee'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export interface UserMembership {
  id: string
  user_id: string
  organization_id: string
  role: UserRole
  scope: string
  is_active: boolean
  valid_until: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at'>
        Update: Partial<Omit<Organization, 'id'>>
      }
      user_memberships: {
        Row: UserMembership
        Insert: Omit<UserMembership, 'id' | 'created_at'>
        Update: Partial<Omit<UserMembership, 'id'>>
      }
    }
  }
}
