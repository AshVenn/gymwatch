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
import { MoreVertical, Plus, Edit2, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'

interface Member {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  createdAt: string
}

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
}

export default function MembersPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    planId: '',
    startDate: '',
  })

  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // 🔒 Authentication checks
  if (status === 'loading') return <div>Chargement de l'utilisateur...</div>

  if (status === 'unauthenticated')
    return <div className="text-red-500 font-medium">Accès refusé.</div>

  if (!session?.user?.gymId)
    return (
      <div className="text-red-500 font-medium">
        Aucun gymnase associé à votre compte.
      </div>
    )

  const gymId = session.user.gymId
  const membersQueryKey = useMemo(() => ['members', gymId] as const, [gymId])
  const plansQueryKey = useMemo(() => ['plans', gymId] as const, [gymId])

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery<Member[]>({
    queryKey: membersQueryKey,
    enabled: status === 'authenticated',
    queryFn: async () => {
      const response = await fetch('/api/members')

      if (!response.ok) {
        throw new Error('Impossible de charger les membres')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: status === 'authenticated',
    queryFn: async () => {
      const response = await fetch('/api/plans')
      if (!response.ok) {
        throw new Error('Impossible de charger les plans')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/members/${editingId}` : '/api/members'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de sauvegarder le membre')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(membersQueryKey)
      setIsOpen(false)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        planId: '',
        startDate: '',
      })
      setEditingId(null)
      setError(null)
      toast.success(editingId ? 'Membre mis à jour avec succès' : 'Nouveau membre ajouté !')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
      setError(message)
      toast.error(message)
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Impossible de supprimer le membre')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(membersQueryKey)
      toast.success('Membre supprimé avec succès')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Impossible de supprimer le membre'
      toast.error(message)
    },
  })

  const handleAddMember = () => {
    setEditingId(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      planId: '',
      startDate: '',
    })
    setIsOpen(true)
  }

  const handleEditMember = (member: Member) => {
    setEditingId(member.id)
    setFormData({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      planId: '',
      startDate: '',
    })
    setIsOpen(true)
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Prénom et Nom obligatoires.')
      return
    }

    saveMemberMutation.mutate()
  }

  const handleDeleteMember = (memberId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      deleteMemberMutation.mutate(memberId)
    }
  }

  if (membersLoading) return <div>Chargement des membres...</div>

  return (
    <div className="space-y-6">
      {(error || membersError) && (
        <div className="text-red-500 font-medium">
          {error || 'Impossible de charger les membres.'}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Membres</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les membres de votre salle
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddMember}>
              <Plus className="mr-2" size={20} />
              Ajouter un membre
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier le membre' : 'Ajouter un membre'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="member-first-name">Prénom</Label>
                <Input
                  id="member-first-name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="member-last-name">Nom</Label>
                <Input
                  id="member-last-name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="member-phone">Téléphone</Label>
                <Input
                  id="member-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {/* PLAN */}
              <div>
                <label className="block text-sm font-medium mb-2">Plan</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                >
                  <option value="">Aucun</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* START DATE */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={saveMemberMutation.isPending}>
                {saveMemberMutation.isPending
                  ? 'Enregistrement...'
                  : editingId
                    ? 'Mettre à jour'
                    : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Prénom</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.firstName}</TableCell>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.email || '-'}</TableCell>
                <TableCell>{member.phone || '-'}</TableCell>
                <TableCell>
                  {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEditMember(member)}>
                        <Edit2 className="mr-2" size={16} />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => handleDeleteMember(member.id)}
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
