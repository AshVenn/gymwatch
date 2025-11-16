'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
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
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
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

  // ─────────────────────────────────────────────
  // FETCH MEMBERS + PLANS
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.gymId) {
      fetchMembers()
      fetchPlans()
    }
  }, [session])

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members')

      if (!response.ok) {
        console.error('API returned error')
        setMembers([])
        return
      }

      const data = await response.json()
      setMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans')
      const data = await response.json()
      setPlans(data)
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    }
  }

  // ─────────────────────────────────────────────
  // FORM ACTIONS
  // ─────────────────────────────────────────────
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

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName) {
      alert('Prénom et Nom obligatoires.')
      return
    }

    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/members/${editingId}` : '/api/members'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchMembers()
        setIsOpen(false)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          planId: '',
          startDate: '',
        })
      }
    } catch (error) {
      console.error('Failed to save member:', error)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      try {
        const response = await fetch(`/api/members/${memberId}`, {
          method: 'DELETE',
        })
        if (response.ok) await fetchMembers()
      } catch (error) {
        console.error('Failed to delete member:', error)
      }
    }
  }

  // ─────────────────────────────────────────────
  // LOADING & EMPTY STATES
  // ─────────────────────────────────────────────
  if (loading) return <div>Chargement des membres...</div>

  // ─────────────────────────────────────────────
  // PAGE JSX
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
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
              {/* FIRST NAME */}
              <div>
                <label className="block text-sm font-medium mb-2">Prénom</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block text-sm font-medium mb-2">Nom</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="block text-sm font-medium mb-2">Téléphone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {/* PLAN SELECTOR */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan d'abonnement (optionnel)
                </label>
                <select
                  className="border rounded w-full p-2"
                  value={formData.planId}
                  onChange={(e) =>
                    setFormData({ ...formData, planId: e.target.value })
                  }
                >
                  <option value="">Aucun</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {plan.price} MAD
                    </option>
                  ))}
                </select>
              </div>

              {/* START DATE */}
              {formData.planId && (
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
              )}

              <Button onClick={handleSubmit} className="w-full">
                {editingId ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.lastName ?? '-'}</TableCell>
                <TableCell>{member.firstName ?? '-'}</TableCell>
                <TableCell>{member.phone || '-'}</TableCell>
                <TableCell>{member.email || '-'}</TableCell>
                <TableCell>
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString('fr-FR')
                    : '-'}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditMember(member)}>
                        <Edit2 className="mr-2" size={16} />
                        Modifier
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDeleteMember(member.id)}
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
