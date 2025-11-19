"use client"

import type { CSSProperties } from "react"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--success-bg": "hsl(var(--primary) / 0.15)",
          "--success-text": "var(--primary-foreground)",
          "--success-border": "hsl(var(--primary) / 0.5)",
          "--error-bg": "hsl(var(--destructive) / 0.2)",
          "--error-text": "var(--destructive-foreground)",
          "--error-border": "hsl(var(--destructive) / 0.55)",
          "--warning-bg": "hsl(var(--accent) / 0.18)",
          "--warning-text": "var(--accent-foreground)",
          "--warning-border": "hsl(var(--accent) / 0.5)",
          "--info-bg": "hsl(var(--secondary) / 0.18)",
          "--info-text": "var(--secondary-foreground)",
          "--info-border": "hsl(var(--secondary) / 0.55)",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
