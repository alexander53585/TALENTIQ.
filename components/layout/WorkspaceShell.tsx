'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface WorkspaceShellProps {
  children: React.ReactNode
  orgName: string
  plan: string
  logoUrl?: string | null
  userEmail: string
  userRole: string
}

export default function WorkspaceShell({
  children, orgName, plan, logoUrl, userEmail, userRole,
}: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null)

  const activeRole = simulatedRole || userRole

  return (
    <div className="flex min-h-screen bg-[#F0F3FA]">
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        role={activeRole}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          orgName={orgName}
          plan={plan}
          logoUrl={logoUrl}
          userEmail={userEmail}
          userRole={userRole}
          activeRole={activeRole}
          onSimulateRole={setSimulatedRole}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
