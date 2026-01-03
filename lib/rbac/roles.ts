import { UserRole } from "@prisma/client"

export const PLATFORM_ROLES = [UserRole.SUPER_ADMIN, UserRole.SUPER_MANAGER] as const
export const GYM_ROLES = [UserRole.GYM_OWNER, UserRole.GYM_ADMIN] as const

export type Role = UserRole

export const isPlatformRole = (role?: UserRole | null) =>
  role === UserRole.SUPER_ADMIN || role === UserRole.SUPER_MANAGER

export const isGymRole = (role?: UserRole | null) =>
  role === UserRole.GYM_OWNER || role === UserRole.GYM_ADMIN
