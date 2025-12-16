"use client"

import { useTranslations } from "next-intl"

import type { SuperAdminGym } from "@/app/[locale]/(dashboard)/super-admin/hooks"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteGym } from "@/app/[locale]/(dashboard)/super-admin/hooks"

type Props = {
  gym: SuperAdminGym | null
  onClose: () => void
}

export function DeleteGymDialog({ gym, onClose }: Props) {
  const t = useTranslations("superAdminDeleteGym")
  const deleteGym = useDeleteGym()

  const open = Boolean(gym)
  const canDelete = gym ? gym.subscriptionStatus === "SUSPENDED" || gym.subscriptionStatus === "EXPIRED" : false

  const statusLabel = (status?: string | null) => {
    if (!status) return "-"
    if (status === "ACTIVE") return t("statuses.active")
    if (status === "SUSPENDED") return t("statuses.suspended")
    if (status === "EXPIRED") return t("statuses.expired")
    return status
  }

  const handleDelete = () => {
    if (!gym) return
    deleteGym.mutate(
      { gymId: gym.id },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !deleteGym.isPending) {
          onClose()
        }
      }}
    >
      <AlertDialogContent className="max-w-md sm:max-w-lg w-[95vw] p-4 sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg sm:text-xl">{t("title")}</AlertDialogTitle>

          <AlertDialogDescription className="space-y-3 text-left text-sm sm:text-base">
            {gym ? (
              <>
                <p>
                  {t("body.permanentDeletePrefix")} <span className="font-semibold text-foreground">{gym.name}</span>{" "}
                  {t("body.permanentDeleteSuffix")}
                </p>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs sm:text-sm">
                  <span>{t("body.currentStatus")}</span>
                  <Badge variant={gym.subscriptionStatus === "EXPIRED" ? "destructive" : "secondary"}>
                    {statusLabel(gym.subscriptionStatus)}
                  </Badge>
                </div>

                <p>{t("body.rules")}</p>
              </>
            ) : (
              t("body.fallback")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={deleteGym.isPending}>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={!canDelete || deleteGym.isPending}
          >
            {deleteGym.isPending ? t("actions.deleting") : t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
