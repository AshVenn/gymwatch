'use client'

import { ChangeEvent } from "react"
import { useLocale, useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GymVariantOption } from "@/app/hooks/use-variants"

export type ClassFormValues = {
  title: string
  coach: string
  room: string
  capacity: string
  date: string
  startTime: string
  endTime: string
  waitlist: boolean
  gymVariantId?: string
}

type Props = {
  values: ClassFormValues
  onChange: (values: ClassFormValues) => void
  variants: GymVariantOption[]
  isGymAdmin?: boolean
  lockedVariantId?: string | null
  defaultVariantId?: string | null
  disabled?: boolean
}

export function ClassForm({
  values,
  onChange,
  variants,
  isGymAdmin = false,
  lockedVariantId,
  defaultVariantId,
  disabled = false,
}: Props) {
  const t = useTranslations("classForm")
  const locale = useLocale()
  const isRTL = locale === "ar"

  const hasVariants = variants.length > 0

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target
    onChange({
      ...values,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleVariantChange = (value: string) => {
    onChange({ ...values, gymVariantId: value })
  }

  const variantLabel = variants.find(
    (variant) => variant.id === lockedVariantId || variant.id === values.gymVariantId,
  )

  return (
    <div
      className="grid gap-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleInput}
          placeholder={t("titlePlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="coach">{t("coachLabel")}</Label>
          <Input
            id="coach"
            name="coach"
            value={values.coach}
            onChange={handleInput}
            placeholder={t("coachPlaceholder")}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="room">{t("roomLabel")}</Label>
          <Input
            id="room"
            name="room"
            value={values.room}
            onChange={handleInput}
            placeholder={t("roomPlaceholder")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="date">{t("dateLabel")}</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={values.date}
            onChange={handleInput}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="capacity">{t("capacityLabel")}</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            value={values.capacity}
            onChange={handleInput}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="startTime">{t("startTimeLabel")}</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            value={values.startTime}
            onChange={handleInput}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime">{t("endTimeLabel")}</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            value={values.endTime}
            onChange={handleInput}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>{t("variantLabel")}</Label>
          {isGymAdmin ? (
            <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {variantLabel?.name ?? t("lockedVariantFallback")}
            </p>
          ) : (
            <Select
              value={values.gymVariantId || defaultVariantId || variants[0]?.id || ""}
              onValueChange={handleVariantChange}
              disabled={disabled || !hasVariants}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("variantPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name} {variant.isDefault ? t("defaultSuffix") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{t("waitlistLabel")}</p>
            <p className="text-xs text-muted-foreground">
              {t("waitlistDescription")}
            </p>
          </div>
          <Switch
            name="waitlist"
            checked={values.waitlist}
            onCheckedChange={(checked) =>
              onChange({ ...values, waitlist: checked })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
