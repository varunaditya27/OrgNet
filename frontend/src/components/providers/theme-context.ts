import { createContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export type ThemeContextValue = {
  theme: Theme
  resolvedTheme: Exclude<Theme, 'system'>
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
)
