"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  
  // Don't show the toggle in dashboard routes as it's handled by the sidebar
  if (pathname?.startsWith('/dashboard')) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-white/10 w-10 h-10"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 