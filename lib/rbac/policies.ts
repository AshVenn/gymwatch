import { UserRole } from "@prisma/client"
import { Permissions, type Permission } from "./permissions"

const ALL_PERMISSIONS = new Set(Object.values(Permissions))

const SUPER_MANAGER_PERMISSIONS = new Set<Permission>([
  Permissions.PlatformGymsRead,
  Permissions.PlatformGymsWrite,
  Permissions.PlatformInvoicesDownload,
  Permissions.PlatformSettingsManage,
  Permissions.PlatformPartnersManage,
  Permissions.PlatformMarketingManage,
  Permissions.PlatformDemoRequestsManage,
])

const GYM_OWNER_PERMISSIONS = new Set<Permission>([
  Permissions.GymMembersRead,
  Permissions.GymMembersWrite,
  Permissions.GymMembersBulk,
  Permissions.GymVisitsManage,
  Permissions.GymPlansManage,
  Permissions.GymSubscriptionsManage,
  Permissions.GymVariantsManage,
  Permissions.GymReportsExport,
])

const GYM_ADMIN_PERMISSIONS = new Set<Permission>([
  Permissions.GymMembersRead,
  Permissions.GymMembersWrite,
  Permissions.GymMembersBulk,
  Permissions.GymVisitsManage,
  Permissions.GymPlansManage,
  Permissions.GymSubscriptionsManage,
  Permissions.GymVariantsManage,
])

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  SUPER_MANAGER: SUPER_MANAGER_PERMISSIONS,
  GYM_OWNER: GYM_OWNER_PERMISSIONS,
  GYM_ADMIN: GYM_ADMIN_PERMISSIONS,
}

export const getPermissionsForRole = (role?: UserRole | null) =>
  role ? ROLE_PERMISSIONS[role] ?? new Set() : new Set<Permission>()

export const hasPermission = (role: UserRole | null | undefined, permission: Permission) =>
  getPermissionsForRole(role).has(permission)

export const hasAnyPermission = (
  role: UserRole | null | undefined,
  permissions: Permission[],
) => permissions.some((permission) => hasPermission(role, permission))

export const canViewFinancials = (role: UserRole | null | undefined) =>
  hasPermission(role, Permissions.PlatformAnalyticsRevenue)
