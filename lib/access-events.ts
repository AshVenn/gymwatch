import { AccessEventStatus } from "@prisma/client"
import type { VisitResult } from "./visits"

export function resolveAccessEventStatus(visit: VisitResult): AccessEventStatus {
  if (!visit.active) {
    return visit.status === "EXPIRED"
      ? AccessEventStatus.DENIED_EXPIRED
      : AccessEventStatus.DENIED_INACTIVE
  }

  if (visit.alreadyVisited) {
    return AccessEventStatus.ALREADY_CHECKED_IN
  }

  return AccessEventStatus.GRANTED
}

export const ACCESS_EVENT_STATUS_LABELS: Record<AccessEventStatus, string> = {
  GRANTED: "Accès autorisé",
  ALREADY_CHECKED_IN: "Déjà comptabilisé",
  DENIED_EXPIRED: "Abonnement expiré",
  DENIED_INACTIVE: "Abonnement inactif",
  DENIED_FORBIDDEN: "Non autorisé",
}
