"use client"

import { useTranslations } from "next-intl"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlanSettingsForm } from "@/components/superadmin/PlanSettingsForm"
import { PlanModuleList } from "@/components/superadmin/gyms/PlanModules"
import { MarketingPlansManager } from "@/components/superadmin/MarketingPlansManager"
import { getPlanFeatures } from "@/lib/subscription-plans"

export default function SuperAdminPlanSetupPage() {
  const t = useTranslations("superAdminPlanSetup")
  const capT = useTranslations("superAdminPlanCap")

  const tiers: Array<"BASIC" | "PRO" | "ENTERPRISE"> = ["BASIC", "PRO", "ENTERPRISE"]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("capsTitle")}</CardTitle>
            <CardDescription>{t("capsDescription")}</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full border-dashed border-border/60 text-[11px]">
            {capT("label")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlanSettingsForm />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle>{t("featuresTitle")}</CardTitle>
          <CardDescription>{t("featuresDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier}
              className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{t(`plans.${tier}`)}</p>
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  {capT("label")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t("featuresHelper")}</p>
              <div className="mt-3">
                <PlanModuleList features={getPlanFeatures(tier)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <MarketingPlansManager />
    </div>
  )
}
