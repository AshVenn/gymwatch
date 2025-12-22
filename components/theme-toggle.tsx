"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"
  const pressed = mounted ? isDark : undefined

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Basculer entre le mode clair et sombre"
      aria-pressed={pressed}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative rounded-full border border-border/60"
    >
      <Sun className={`h-5 w-5 transition-all ${mounted && !isDark ? "scale-100" : "scale-0"}`} />
      <Moon className={`absolute h-5 w-5 transition-all ${mounted && isDark ? "scale-100" : "scale-0"}`} />
      <span className="sr-only">Changer le thème</span>
    </Button>
  )
}
