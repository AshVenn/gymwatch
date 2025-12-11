import { AccessEventStatus } from "@prisma/client"
import type { VisitResult } from "./visits"

export function resolveAccessEventStatus(
  visit: VisitResult,
  mode: "CHECK_IN" | "CHECK_OUT" = "CHECK_IN",
): AccessEventStatus {
  if (mode === "CHECK_OUT") {
    return AccessEventStatus.CHECKED_OUT
  }

  if (!visit.active) {
    return visit.status === "EXPIRED"
      ? AccessEventStatus.DENIED_EXPIRED
      : AccessEventStatus.DENIED_INACTIVE
  }

  if (visit.overDailyLimit) {
    return AccessEventStatus.DENIED_DAILY_LIMIT
  }

  if (visit.markVisitAttempted && !visit.visitRecorded) {
    return AccessEventStatus.ALREADY_CHECKED_IN
  }

  return AccessEventStatus.GRANTED
}

export const ACCESS_EVENT_STATUS_LABELS: Record<AccessEventStatus, string> = {
  GRANTED: "Acces autorise",
  CHECKED_OUT: "Sortie enregistree",
  SESSION_OVERSTAY: "Session depassee",
  ALREADY_CHECKED_IN: "Deja comptabilise",
  DENIED_DAILY_LIMIT: "Limite journaliere atteinte",
  DENIED_EXPIRED: "Abonnement expire",
  DENIED_INACTIVE: "Abonnement inactif",
  DENIED_FORBIDDEN: "Non autorise",
}
