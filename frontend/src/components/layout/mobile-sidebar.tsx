import { Menu } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import type { Role } from '@/utils/roles'

interface MobileSidebarProps {
  role?: Role | null
}

export const MobileSidebar = ({ role }: MobileSidebarProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="px-6 py-4 text-left">
          <SheetTitle>OrgNet Navigation</SheetTitle>
        </SheetHeader>
        <div className="h-full">
          <Sidebar role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
