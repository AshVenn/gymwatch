'use client'

import { useEffect, useState } from 'react'
import {
  useCreateGym,
  useCreateGymAdmin,
  useSuperAdminGym,
  useSuperAdminGyms,
  useUpdateGym,
} from '../hooks'
import { GymSubscriptionPlan, GymSubscriptionStatus } from '@prisma/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-red-100 text-red-700',
}

const INITIAL_CREATE = {
  name: '',
  email: '',
  city: '',
  country: '',
  plan: 'MONTHLY',
  status: 'ACTIVE',
  expiresAt: '',
  grace: 5,
  maxAdmins: 3,
  ownerEmail: '',
  ownerPassword: '',
  ownerFirstName: '',
  ownerLastName: '',
}

export default function SuperAdminGymsPage() {
  const { data: gyms = [], isLoading } = useSuperAdminGyms()
  const updateMutation = useUpdateGym()
  const createGym = useCreateGym()
  const createAdmin = useCreateGymAdmin()

  const [detailId, setDetailId] = useState<string | null>(null)
  const { data: selectedGym } = useSuperAdminGym(detailId)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_CREATE)
  const [adminForm, setAdminForm] = useState({ email: '', firstName: '', lastName: '', password: '' })
  const [updateForm, setUpdateForm] = useState({
    status: 'ACTIVE',
    plan: 'MONTHLY',
    expiresAt: '',
    grace: 0,
    maxAdmins: 3,
  })

  useEffect(() => {
    if (!selectedGym) return
    setUpdateForm({
      status: selectedGym.subscriptionStatus,
      plan: selectedGym.subscriptionPlan,
      expiresAt: selectedGym.subscriptionExpiresAt?.split('T')[0] ?? '',
      grace: selectedGym.subscriptionGracePeriodDays,
      maxAdmins: selectedGym.maxAdminAccounts,
    })
  }, [selectedGym])

  const pagination = usePagination(gyms, 8)

  const handleToggleStatus = (gymId: string, status: GymSubscriptionStatus) => {
    const next = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    updateMutation.mutate({ gymId, data: { subscriptionStatus: next } })
  }

  const handleCreateGym = (event: React.FormEvent) => {
    event.preventDefault()
    createGym.mutate(
      {
        name: createForm.name,
        email: createForm.email,
        city: createForm.city || undefined,
        country: createForm.country || undefined,
        subscriptionPlan: createForm.plan as GymSubscriptionPlan,
        subscriptionStatus: createForm.status as GymSubscriptionStatus,
        subscriptionExpiresAt: createForm.expiresAt || undefined,
        subscriptionGracePeriodDays: Number(createForm.grace) || 0,
        maxAdminAccounts: Number(createForm.maxAdmins) || 1,
        owner: {
          email: createForm.ownerEmail,
          password: createForm.ownerPassword,
          firstName: createForm.ownerFirstName || 'Owner',
          lastName: createForm.ownerLastName || createForm.name,
        },
      },
      {
        onSuccess: () => {
          setCreateForm(INITIAL_CREATE)
          setCreateOpen(false)
        },
      },
    )
  }

  const handleUpdate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!detailId) return
    updateMutation.mutate({
      gymId: detailId,
      data: {
        subscriptionStatus: updateForm.status as GymSubscriptionStatus,
        subscriptionPlan: updateForm.plan as GymSubscriptionPlan,
        subscriptionExpiresAt: updateForm.expiresAt || null,
        subscriptionGracePeriodDays: Number(updateForm.grace) || 0,
        maxAdminAccounts: Number(updateForm.maxAdmins) || 1,
      },
    })
  }

  const handleCreateAdmin = (event: React.FormEvent) => {
    event.preventDefault()
    if (!detailId) return
    createAdmin.mutate(
      {
        gymId: detailId,
        ...adminForm,
      },
      {
        onSuccess: () => setAdminForm({ email: '', firstName: '', lastName: '', password: '' }),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des salles</h1>
          <p className="text-muted-foreground">Créer, suspendre ou inspecter les comptes clients.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une salle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle salle</DialogTitle>
              <DialogDescription>Paramétrez l’abonnement et le propriétaire.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateGym}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Nom</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Ville</Label>
                  <Input value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input value={createForm.country} onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Plan</Label>
                  <Select value={createForm.plan} onValueChange={(value) => setCreateForm({ ...createForm, plan: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensuel</SelectItem>
                      <SelectItem value="YEARLY">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={createForm.status} onValueChange={(value) => setCreateForm({ ...createForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                      <SelectItem value="EXPIRED">Expiré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>Expiration</Label>
                  <Input type="date" value={createForm.expiresAt} onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })} />
                </div>
                <div>
                  <Label>Jours de grâce</Label>
                  <Input type="number" value={createForm.grace} onChange={(e) => setCreateForm({ ...createForm, grace: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Admins autorisés</Label>
                  <Input type="number" value={createForm.maxAdmins} onChange={(e) => setCreateForm({ ...createForm, maxAdmins: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Email propriétaire</Label>
                  <Input type="email" value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })} required />
                </div>
                <div>
                  <Label>Mot de passe propriétaire</Label>
                  <Input type="password" value={createForm.ownerPassword} onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Prénom propriétaire</Label>
                  <Input value={createForm.ownerFirstName} onChange={(e) => setCreateForm({ ...createForm, ownerFirstName: e.target.value })} />
                </div>
                <div>
                  <Label>Nom propriétaire</Label>
                  <Input value={createForm.ownerLastName} onChange={(e) => setCreateForm({ ...createForm, ownerLastName: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createGym.isPending}>
                {createGym.isPending ? 'Création...' : 'Créer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des salles</CardTitle>
          <CardDescription>Vue paginée de toutes les salles actives ou suspendues.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Chargement...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.data.map((gym) => (
                    <TableRow key={gym.id}>
                      <TableCell>
                        <div className="font-medium">{gym.name}</div>
                        <div className="text-xs text-muted-foreground">{gym.email}</div>
                      </TableCell>
                      <TableCell>
                        {gym.owner ? (
                          <div>
                            <p className="text-sm font-medium">
                              {[gym.owner.firstName, gym.owner.lastName].filter(Boolean).join(' ') || gym.owner.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{gym.owner.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[gym.subscriptionStatus] ?? ''}>{gym.subscriptionStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {gym.adminCount}/{gym.maxAdminAccounts}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(gym.subscriptionExpiresAt)}</div>
                        {typeof gym.daysRemaining === 'number' && (
                          <span className="text-xs text-muted-foreground">
                            {gym.daysRemaining > 0 ? `${gym.daysRemaining} jours` : 'Expiré'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailId(gym.id)}>
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleStatus(gym.id, gym.subscriptionStatus)}
                          disabled={updateMutation.isPending}
                        >
                          {gym.subscriptionStatus === 'ACTIVE' ? 'Suspendre' : 'Activer'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                page={pagination.page}
                pageCount={pagination.pageCount}
                onPageChange={pagination.setPage}
                totalItems={gyms.length}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-4xl">
          {!selectedGym ? (
            <div className="py-10 text-center text-muted-foreground">Chargement...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Salle</CardDescription>
                    <CardTitle>{selectedGym.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>{selectedGym.email}</p>
                    <p>{[selectedGym.city, selectedGym.country].filter(Boolean).join(', ')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Propriétaire</CardDescription>
                    <CardTitle className="text-base">
                      {selectedGym.owner
                        ? [selectedGym.owner.firstName, selectedGym.owner.lastName].filter(Boolean).join(' ') || selectedGym.owner.email
                        : 'Non défini'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {selectedGym.owner?.email ?? '—'}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Équipe</CardDescription>
                    <CardTitle>
                      {selectedGym.adminCount}/{selectedGym.maxAdminAccounts} administrateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedGym.admins?.length ? (
                      selectedGym.admins.map((admin) => (
                        <div key={admin.id} className="rounded-md border p-2 text-sm">
                          <p className="font-medium">
                            {[admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun administrateur.</p>
                    )}
                  </CardContent>
                </Card>
                <form className="space-y-3" onSubmit={handleCreateAdmin}>
                  <h3 className="text-sm font-semibold">Ajouter un administrateur</h3>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Prénom"
                      value={adminForm.firstName}
                      onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                      required
                    />
                    <Input
                      placeholder="Nom"
                      value={adminForm.lastName}
                      onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <Input
                    placeholder="Mot de passe temporaire"
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={
                      createAdmin.isPending || selectedGym.adminCount >= selectedGym.maxAdminAccounts
                    }
                  >
                    {createAdmin.isPending ? 'Création...' : 'Ajouter'}
                  </Button>
                </form>
              </div>

              <form className="space-y-4" onSubmit={handleUpdate}>
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres d’abonnement</CardTitle>
                    <CardDescription>Mettez à jour le plan ou la capacité.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Statut</Label>
                      <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Actif</SelectItem>
                          <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                          <SelectItem value="EXPIRED">Expiré</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plan</Label>
                      <Select value={updateForm.plan} onValueChange={(value) => setUpdateForm({ ...updateForm, plan: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Mensuel</SelectItem>
                          <SelectItem value="YEARLY">Annuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Expiration</Label>
                      <Input type="date" value={updateForm.expiresAt} onChange={(e) => setUpdateForm({ ...updateForm, expiresAt: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <Label>Jours de grâce</Label>
                        <Input type="number" value={updateForm.grace} onChange={(e) => setUpdateForm({ ...updateForm, grace: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Admins autorisés</Label>
                        <Input type="number" value={updateForm.maxAdmins} onChange={(e) => setUpdateForm({ ...updateForm, maxAdmins: Number(e.target.value) })} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}
