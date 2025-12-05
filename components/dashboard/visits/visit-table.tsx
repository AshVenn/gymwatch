'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type VisitRow = {
  id: string
  memberName: string
  variantName: string
  checkIn: Date
  checkOut: Date | null
  durationMinutes: number
  isOverMaxDuration: boolean
}

function formatTime(value: Date | null) {
  if (!value) return '--'
  return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return 'Instantané'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  if (remaining === 0) return `${hours} h`
  return `${hours} h ${remaining} min`
}

interface VisitTableProps {
  visits: VisitRow[]
  maxSessionMinutes?: number | null
}

export function VisitTable({ visits, maxSessionMinutes }: VisitTableProps) {
  if (!visits.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Aucune visite sur ce filtre</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Utilisez les filtres pour changer de date ou enregistrez une nouvelle visite depuis la fiche membre.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Dernières visites</CardTitle>
        {maxSessionMinutes ? (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-xs text-muted-foreground">
            Durée max: {maxSessionMinutes} min
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Salle</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Entrée</TableHead>
              <TableHead>Sortie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Durée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => {
              const checkInDate = visit.checkIn.toLocaleDateString('fr-FR')
              const checkOutLabel = visit.checkOut ? formatTime(visit.checkOut) : null
              const overLimit = Boolean(visit.isOverMaxDuration)
              return (
                <TableRow key={visit.id}>
                  <TableCell className="font-medium">{visit.memberName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border/70">
                      {visit.variantName}
                    </Badge>
                  </TableCell>
                  <TableCell>{checkInDate}</TableCell>
                  <TableCell>{formatTime(visit.checkIn)}</TableCell>
                  <TableCell>
                    {checkOutLabel ? (
                      checkOutLabel
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        En cours
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {overLimit ? (
                      <Badge className="bg-destructive/15 text-destructive" variant="outline">
                        Période dépassée
                      </Badge>
                    ) : visit.checkOut ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        Terminée
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        En cours
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={overLimit ? 'font-semibold text-destructive' : undefined}>
                    {formatDuration(visit.durationMinutes)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
