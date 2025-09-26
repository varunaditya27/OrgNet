import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/components/layout/sidebar'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { UserMenu } from '@/components/layout/user-menu'
import { useAuth } from '@/hooks/useAuth'

export const AppLayout = () => {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card/60 lg:block">
        <Sidebar role={user?.role} />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <MobileSidebar role={user?.role} />
              <div>
                <h1 className="text-base font-semibold md:text-lg">OrgNet</h1>
                <p className="text-xs text-muted-foreground md:text-sm">
                  Secure organizational collaboration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Topbar />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
