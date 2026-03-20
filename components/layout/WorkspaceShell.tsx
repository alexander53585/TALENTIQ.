'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface WorkspaceShellProps {
  children: React.ReactNode
  orgName: string
  plan: string
  userEmail: string
  userRole: string
}

export default function WorkspaceShell({
  children, orgName, plan, userEmail, userRole,
}: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#F0F3FA]">
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        role={userRole}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          orgName={orgName}
          plan={plan}
          userEmail={userEmail}
          userRole={userRole}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
