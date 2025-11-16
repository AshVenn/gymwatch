import { SubscriptionStatus } from '@prisma/client'

export function computeSubscriptionStatus(endDate: Date): SubscriptionStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  if (end.getTime() < today.getTime()) {
    return SubscriptionStatus.EXPIRED
  } else if (end.getTime() === today.getTime()) {
    return SubscriptionStatus.EXPIRES_TODAY
  } else {
    return SubscriptionStatus.ACTIVE
  }
}

export function daysUntilExpiry(endDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}
