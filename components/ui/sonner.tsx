'use client'

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/utils'

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

export function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="top-right"
      className={cn('toaster group pointer-events-none', className)}
      toastOptions={{
        classNames: {
          toast:
            'group pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 p-4 text-sm text-white shadow-2xl backdrop-blur',
          title: 'text-base font-semibold',
          description: 'text-sm text-slate-200/90',
          actionButton:
            'inline-flex h-8 items-center justify-center rounded-md border border-slate-500/40 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20',
          cancelButton:
            'inline-flex h-8 items-center justify-center rounded-md border border-transparent bg-slate-800/70 px-3 text-sm font-medium text-slate-100 transition hover:bg-slate-700/80',
        },
        ...toastOptions,
      }}
      {...props}
    />
  )
}

export const toast = sonnerToast
