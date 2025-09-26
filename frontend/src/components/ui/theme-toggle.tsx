import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark'

  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-1">
      <Button
        variant={isDark ? 'ghost' : 'default'}
        size="icon"
        className="h-8 w-8"
        aria-label="Use light theme"
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={isDark ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        aria-label="Use dark theme"
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  )
}
