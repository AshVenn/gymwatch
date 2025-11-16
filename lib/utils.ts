import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cuid(): string {
  return 'c' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}
