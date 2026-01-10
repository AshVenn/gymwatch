"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MoreVertical, Plus, ShieldCheck, ShieldOff } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { useRouter } from "@/i18n/routing"

type PlatformRole = "SUPER_ADMIN" | "SUPER_MANAGER"
type UserStatus = "ACTIVE" | "SUSPENDED"

type PlatformUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: PlatformRole
  status: UserStatus
  createdAt: string
  lastLoginAt?: string | null
}

type UsersResponse = {
  items: PlatformUser[]
  total: number
  page: number
  pageSize: number
}

const roleOptions: Array<{ value: PlatformRole; labelKey: string }> = [
  { value: "SUPER_ADMIN", labelKey: "roles.superAdmin" },
  { value: "SUPER_MANAGER", labelKey: "roles.superManager" },
]

const statusOptions: Array<{ value: UserStatus; labelKey: string }> = [
  { value: "ACTIVE", labelKey: "status.active" },
  { value: "SUSPENDED", labelKey: "status.suspended" },
]

const formatValidationErrors = (details?: {
  fieldErrors?: Record<string, string[]>
  formErrors?: string[]
}) => {
  if (!details) return ""
  const messages: string[] = []
  if (Array.isArray(details.formErrors) && details.formErrors.length) {
    messages.push(...details.formErrors)
  }
  if (details.fieldErrors) {
    for (const [field, errors] of Object.entries(details.fieldErrors)) {
      if (errors?.length) {
        messages.push(`${field}: ${errors.join(", ")}`)
      }
    }
  }
  return messages.join(" | ")
}

export default function SuperAdminUsersPage() {
  const t = useTranslations("superAdminUsers")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const { data: session, status } = useSession()
  const router = useRouter()

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL" | PlatformRole>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null)

  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "SUPER_MANAGER" as PlatformRole,
    status: "ACTIVE" as UserStatus,
    password: "",
  })

  const [editForm, setEditForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "SUPER_MANAGER" as PlatformRole,
    status: "ACTIVE" as UserStatus,
  })

  useEffect(() => {
    setPage(1)
  }, [query, roleFilter, statusFilter, pageSize])

  useEffect(() => {
    if (status === "authenticated" && !isSuperAdmin) {
      router.replace("/super-admin")
    }
  }, [isSuperAdmin, router, status])

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (status === "authenticated" && !isSuperAdmin) {
    return null
  }

  const usersQuery = useQuery<UsersResponse>({
    queryKey: ["super-admin", "users", query, roleFilter, statusFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("query", query.trim())
      if (roleFilter !== "ALL") params.set("role", roleFilter)
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const response = await fetch(`/api/super-admin/users?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || payload.error || t("errors.load"))
      }
      return payload as UsersResponse
    },
    placeholderData: keepPreviousData,
  })

  const createUser = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const validationMessage = formatValidationErrors(payload.details)
        throw new Error(validationMessage || payload.message || payload.error || t("errors.create"))
      }
      return payload as PlatformUser
    },
    onSuccess: () => {
      toast.success(t("toasts.created"))
      setCreateOpen(false)
      setCreateForm({
        email: "",
        firstName: "",
        lastName: "",
        role: "SUPER_MANAGER",
        status: "ACTIVE",
        password: "",
      })
      queryClient.invalidateQueries({ queryKey: ["super-admin", "users"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateUser = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<PlatformUser> }) => {
      const response = await fetch(`/api/super-admin/users/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const validationMessage = formatValidationErrors(body.details)
        throw new Error(validationMessage || body.message || body.error || t("errors.update"))
      }
      return body as PlatformUser
    },
    onSuccess: () => {
      toast.success(t("toasts.updated"))
      setEditOpen(false)
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ["super-admin", "users"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/super-admin/users/${userId}/reset-password`, {
        method: "POST",
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.message || body.error || t("errors.resetPassword"))
      }
      return body as { temporaryPassword: string }
    },
    onSuccess: (data) => {
      toast.success(t("toasts.resetPassword"), {
        description: data.temporaryPassword,
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const openEdit = (user: PlatformUser) => {
    setEditingUser(user)
    setEditForm({
      email: user.email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      role: user.role,
      status: user.status,
    })
    setEditOpen(true)
  }

  const submitEdit = () => {
    if (!editingUser) return
    updateUser.mutate({
      id: editingUser.id,
      data: {
        email: editForm.email,
        firstName: editForm.firstName || null,
        lastName: editForm.lastName || null,
        role: editForm.role,
        status: editForm.status,
      },
    })
  }

  const toggleStatus = (user: PlatformUser) => {
    const nextStatus: UserStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
    updateUser.mutate({
      id: user.id,
      data: { status: nextStatus },
    })
  }

  const resolveRoleLabel = (role: PlatformRole) => {
    const labelKey = roleOptions.find((option) => option.value === role)?.labelKey ?? role
    return t(labelKey)
  }

  const resolveStatusLabel = (status: UserStatus) => {
    const labelKey = statusOptions.find((option) => option.value === status)?.labelKey ?? status
    return t(labelKey)
  }

  const total = usersQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const items = usersQuery.data?.items ?? []
  const columnCount = 6

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("actions.create")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.6fr]">
        <div className="space-y-2">
          <Label>{t("filters.search")}</Label>
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("filters.role")}</Label>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allRoles")}</SelectItem>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("filters.status")}</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("filters.pageSize")}</Label>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/90 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.columns.name")}</TableHead>
                <TableHead>{t("table.columns.role")}</TableHead>
                <TableHead>{t("table.columns.status")}</TableHead>
                <TableHead>{t("table.columns.createdAt")}</TableHead>
                <TableHead>{t("table.columns.lastLoginAt")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("table.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell colSpan={columnCount}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length ? (
                items.map((user) => {
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
                  const isSuspended = user.status === "SUSPENDED"

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{fullName || t("table.nameFallback")}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{resolveRoleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>
                          {resolveStatusLabel(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString(locale)}</TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString(locale)
                          : t("table.never")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={t("table.columns.actions")}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => openEdit(user)}>
                                {t("table.actions.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => toggleStatus(user)}>
                                {isSuspended ? (
                                  <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    {t("table.actions.activate")}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <ShieldOff className="h-4 w-4" />
                                    {t("table.actions.suspend")}
                                  </span>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => resetPassword.mutate(user.id)}>
                                {t("table.actions.resetPassword")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageChange={setPage}
          totalItems={total}
          className="mt-0 rounded-none border-0 border-t border-border/70 bg-transparent px-4 py-4"
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-first">{t("fields.firstName")}</Label>
              <Input
                id="create-first"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-last">{t("fields.lastName")}</Label>
              <Input
                id="create-last"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">{t("fields.email")}</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">{t("fields.password")}</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.role")}</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, role: value as PlatformRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.status")}</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, status: value as UserStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={() => createUser.mutate()} disabled={createUser.isPending}>
              {createUser.isPending ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => (!open ? setEditOpen(false) : null)}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first">{t("fields.firstName")}</Label>
              <Input
                id="edit-first"
                value={editForm.firstName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last">{t("fields.lastName")}</Label>
              <Input
                id="edit-last"
                value={editForm.lastName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("fields.email")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.role")}</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value as PlatformRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.status")}</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value as UserStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={submitEdit} disabled={updateUser.isPending}>
              {updateUser.isPending ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
