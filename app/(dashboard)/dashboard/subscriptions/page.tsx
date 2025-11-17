'use client'

import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreVertical, Trash2, RotateCcw } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Subscription {
  id: string
  memberName: string
  planName: string
  startDate: string
  endDate: string
  daysLeft: number
  status: 'ACTIVE' | 'EXPIRES_TODAY' | 'EXPIRED'
  pricePaid: number
}

export default function SubscriptionsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewalForm, setRenewalForm] = useState({
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
  })

  const gymId = session?.user?.gymId

  const subscriptionQueryKey = useMemo(
    () => ['subscriptions', gymId, { searchTerm, filterStatus }] as const,
    [gymId, searchTerm, filterStatus]
  )
  const plansQueryKey = useMemo(() => ['plans', gymId] as const, [gymId])

  const {
    data: subscriptions = [],
    isLoading,
    isError,
  } = useQuery<Subscription[]>({
    queryKey: subscriptionQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      const normalizedStatus = filterStatus === 'ALL' ? '' : filterStatus
      if (normalizedStatus) params.append('status', normalizedStatus)

      const response = await fetch(`/api/subscriptions?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Impossible de charger les abonnements')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: plansQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const response = await fetch('/api/plans')
      if (!response.ok) {
        throw new Error('Impossible de charger les plans')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer cet abonnement')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(subscriptionQueryKey)
    },
  })

  const renewSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!renewingId) {
        throw new Error('Aucun abonnement sélectionné')
      }

      const response = await fetch(`/api/subscriptions/${renewingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewalForm),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de renouveler l\'abonnement')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(subscriptionQueryKey)
      setRenewingId(null)
      setRenewalForm({ planId: '', startDate: new Date().toISOString().split('T')[0] })
    },
  })

  const handleDeleteSubscription = (subscriptionId: string) => {
    if (!subscriptionId) return

    if (confirm('Êtes-vous sûr de vouloir supprimer cet abonnement ?')) {
      deleteSubscriptionMutation.mutate(subscriptionId)
    }
  }

  const handleRenewalSubmit = () => {
    if (!renewalForm.planId) {
      alert('Veuillez sélectionner un plan.')
      return
    }

    renewSubscriptionMutation.mutate()
  }

  const safeDate = (d: any) => {
    if (!d) return '-'
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('fr-FR')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>
      case 'EXPIRES_TODAY':
        return <Badge className="bg-yellow-100 text-yellow-800">Expire aujourd'hui</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Expiré</Badge>
      default:
        return <Badge>{status ?? '-'}</Badge>
    }
  }

  if (isLoading) {
    return <div>Chargement des abonnements...</div>
  }

  const filteredSubscriptions = (subscriptions ?? []).filter((sub) => {
    const matchesSearch =
      sub.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.planName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'ALL' || filterStatus === '' || sub.status === filterStatus

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Abonnements</h1>
        <p className="text-muted-foreground mt-2">Gérez les abonnements de vos membres</p>
      </div>

      {isError && (
        <div className="text-red-500">Impossible de charger les abonnements.</div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Rechercher</label>
          <Input
            placeholder="Nom du membre ou du plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Statut</label>
          <Select
            value={filterStatus}
            onValueChange={(value) => {
              setFilterStatus(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="EXPIRES_TODAY">Expire aujourd'hui</SelectItem>
              <SelectItem value="EXPIRED">Expiré</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Membre</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Date de début</TableHead>
              <TableHead>Date de fin</TableHead>
              <TableHead>Jours restants</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {(filteredSubscriptions ?? []).map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.memberName ?? '-'}</TableCell>
                <TableCell>{sub.planName ?? '-'}</TableCell>

                <TableCell>{safeDate(sub.startDate)}</TableCell>
                <TableCell>{safeDate(sub.endDate)}</TableCell>

                <TableCell>
                  <span
                    className={`font-medium ${
                      sub.daysLeft < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {sub.daysLeft < 0 ? '-' : ''}
                    {Math.abs(sub.daysLeft ?? 0)}
                  </span>
                </TableCell>

                <TableCell>{getStatusBadge(sub.status)}</TableCell>

                <TableCell className="text-right">
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {/* Renew */}
                      <Dialog
                        open={renewingId === sub.id}
                        onOpenChange={(open) => !open && setRenewingId(null)}
                      >
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setRenewingId(sub.id)
                              setRenewalForm({
                                planId: '',
                                startDate: new Date().toISOString().split('T')[0],
                              })
                            }}
                          >
                            <RotateCcw className="mr-2" size={16} />
                            Renouveler
                          </DropdownMenuItem>
                        </DialogTrigger>

                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Renouveler l'abonnement</DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Plan</label>
                              <Select
                                value={renewalForm.planId}
                                onValueChange={(value) =>
                                  setRenewalForm({ ...renewalForm, planId: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un plan" />
                                </SelectTrigger>

                                <SelectContent>
                                  {(plans ?? []).map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      {plan.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Date de début
                              </label>
                              <Input
                                type="date"
                                value={renewalForm.startDate}
                                onChange={(e) =>
                                  setRenewalForm({ ...renewalForm, startDate: e.target.value })
                                }
                              />
                            </div>

                            <Button className="w-full" onClick={handleRenewalSubmit} disabled={renewSubscriptionMutation.isPending}>
                              {renewSubscriptionMutation.isPending ? 'Renouvellement...' : 'Renouveler'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Delete */}
                      <DropdownMenuItem
                        onClick={() => handleDeleteSubscription(sub.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2" size={16} />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
