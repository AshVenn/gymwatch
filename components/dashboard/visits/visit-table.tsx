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
}

export function VisitTable({ visits }: VisitTableProps) {
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
      <CardHeader className="pb-3">
        <CardTitle>Dernières visites</CardTitle>
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
              <TableHead>Durée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => {
              const checkInDate = visit.checkIn.toLocaleDateString('fr-FR')
              const checkOutLabel = visit.checkOut ? formatTime(visit.checkOut) : null
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
                  <TableCell>{formatDuration(visit.durationMinutes)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
