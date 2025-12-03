import { ChangeEvent } from "react"
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

  const variantLabel = variants.find((variant) => variant.id === lockedVariantId || variant.id === values.gymVariantId)

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Titre du cours</Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleInput}
          placeholder="Cross-training, Yoga..."
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="coach">Coach</Label>
          <Input
            id="coach"
            name="coach"
            value={values.coach}
            onChange={handleInput}
            placeholder="Nom du coach"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="room">Salle / Studio</Label>
          <Input
            id="room"
            name="room"
            value={values.room}
            onChange={handleInput}
            placeholder="Salle A, Studio 2..."
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" value={values.date} onChange={handleInput} disabled={disabled} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="capacity">Capacite</Label>
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
          <Label htmlFor="startTime">Heure de debut</Label>
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
          <Label htmlFor="endTime">Heure de fin</Label>
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
          <Label>Variante</Label>
          {isGymAdmin ? (
            <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {variantLabel?.name ?? "Variante verrouillee"}
            </p>
          ) : (
            <Select
              value={values.gymVariantId || defaultVariantId || variants[0]?.id || ""}
              onValueChange={handleVariantChange}
              disabled={disabled || !hasVariants}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une variante" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name} {variant.isDefault ? "(defaut)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Liste d attente</p>
            <p className="text-xs text-muted-foreground">Autoriser les places en attente si complet</p>
          </div>
          <Switch
            name="waitlist"
            checked={values.waitlist}
            onCheckedChange={(checked) => onChange({ ...values, waitlist: checked })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
