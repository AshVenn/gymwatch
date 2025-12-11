'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PaginationControls } from '@/components/dashboard/pagination-controls'

type VisitRow = {
  id: string
  memberName: string
  variantName: string
  checkIn: Date
  checkOut: Date | null
  durationMinutes: number
  isOverMaxDuration: boolean
  sessionLimitMinutes?: number | null
}

function formatTime(value: Date | null) {
  if (!value) return '--'
  return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return 'Instantane'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  if (remaining === 0) return `${hours} h`
  return `${hours} h ${remaining} min`
}

interface VisitTableProps {
  visits: VisitRow[]
  maxSessionMinutes?: number | null
  pagination?: {
    page: number
    pageCount: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
  }
}

export function VisitTable({ visits, maxSessionMinutes, pagination }: VisitTableProps) {
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
        <CardTitle>Dernieres visites</CardTitle>
        {maxSessionMinutes ? (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-xs text-muted-foreground">
            Duree max: {maxSessionMinutes} min
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
              <TableHead>Entree</TableHead>
              <TableHead>Sortie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Duree</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => {
              const checkInDate = visit.checkIn.toLocaleDateString('fr-FR')
              const checkOutLabel = visit.checkOut ? formatTime(visit.checkOut) : null
              const overLimit = Boolean(visit.isOverMaxDuration)
              const limitLabel =
                typeof visit.sessionLimitMinutes === 'number' && visit.sessionLimitMinutes > 0
                  ? `${visit.sessionLimitMinutes} min`
                  : null
              return (
                <TableRow key={visit.id} className={overLimit ? 'bg-destructive/5' : undefined}>
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
                      <div className="flex flex-col gap-1">
                        <Badge className="bg-destructive/15 text-destructive" variant="outline">
                          Periode depassee
                        </Badge>
                        {limitLabel ? (
                          <span className="text-xs text-muted-foreground">Limite {limitLabel}</span>
                        ) : null}
                      </div>
                    ) : visit.checkOut ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        Terminee
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
        {pagination ? (
          <PaginationControls
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.onPageChange}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
