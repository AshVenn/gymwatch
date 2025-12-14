"use client"

import type React from "react"

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border-2 shadow-lg backdrop-blur-sm",
          title: "font-semibold text-sm",
          description: "text-sm",
          success: "bg-emerald-500 text-white border-emerald-600",
          info: "bg-blue-500 text-white border-blue-600",
          warning: "bg-amber-500 text-white border-amber-600",
          error: "bg-red-500 text-white border-red-600",
          loading: "bg-card text-card-foreground border-border",
        },
      }}
      style={
        {
          "--normal-bg": "oklch(var(--card))",
          "--normal-text": "oklch(var(--card-foreground))",
          "--normal-border": "oklch(var(--border))",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
