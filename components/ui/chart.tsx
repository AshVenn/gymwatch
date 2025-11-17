"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | undefined>(undefined)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer>")
  }

  return context
}

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { config: ChartConfig }>(
  ({ config, className, children, ...props }, ref) => {
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          className={cn(
            "flex w-full flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 text-card-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    )
  },
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean
  }
>(({ className, hideLabel, ...props }, ref) => {
  const { config } = useChart()
  const payload = (props as RechartsPrimitive.TooltipProps<any, any>).payload?.[0]

  if (!payload) return null

  const name = payload.name as string
  const color = payload.color ?? config[name]?.color
  const label = config[name]?.label ?? name

  return (
    <div
      ref={ref}
      className={cn(
        "min-w-[8rem] rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md",
        className,
      )}
    >
      {!hideLabel && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex size-2 rounded-full" style={{ backgroundColor: color }} />
          <span>{label}</span>
        </div>
      )}
      <div className="mt-2 font-semibold">{payload.value}</div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig }
