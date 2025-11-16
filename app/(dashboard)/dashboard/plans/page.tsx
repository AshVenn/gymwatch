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

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
}

export default function PlansPage() {
  const { data: session, status } = useSession()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    durationDays: '',
    price: '',
    isActive: true,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔒 BLOCK PAGE IF USER IS NOT AUTHENTICATED
  if (status === 'loading') {
    return <div>Chargement de l'utilisateur...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="text-red-500 font-medium">Accès refusé. Vous devez être connecté.</div>
  }

  if (!session?.user?.gymId) {
    return <div className="text-red-500 font-medium">Aucun gymnase associé à votre compte.</div>
  }

  useEffect(() => {
    // Fetch only when session is ready
    if (status === 'authenticated' && session?.user?.gymId) {
      fetchPlans()
    }
  }, [session, status])

  const fetchPlans = async () => {
    try {
      setError(null)
      const response = await fetch('/api/plans')

      if (!response.ok) {
        if (response.status === 401) {
          setError("Non autorisé. Votre session a peut-être expiré.")
          setPlans([])
          return
        }
        throw new Error("Erreur serveur.")
      }

      const data = await response.json()
      setPlans(data)
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      setError("Impossible de charger les plans.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlan = () => {
    setEditingId(null)
    setFormData({ name: '', durationDays: '', price: '', isActive: true })
    setIsOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id)
    setFormData({
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
      isActive: plan.isActive,
    })
    setIsOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/plans/${editingId}` : '/api/plans'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          durationDays: parseInt(formData.durationDays),
          price: parseFloat(formData.price),
          isActive: formData.isActive,
        }),
      })

      if (response.ok) {
        await fetchPlans()
        setIsOpen(false)
        setFormData({ name: '', durationDays: '', price: '', isActive: true })
      } else {
        setError("Échec de la sauvegarde du plan.")
      }
    } catch (error) {
      console.error('Failed to save plan:', error)
      setError("Erreur lors de la sauvegarde.")
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) {
      try {
        const response = await fetch(`/api/plans/${planId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await fetchPlans()
        } else {
          setError("Impossible de supprimer le plan.")
        }
      } catch (error) {
        console.error('Failed to delete plan:', error)
        setError("Erreur lors de la suppression.")
      }
    }
  }

  if (loading) {
    return <div>Chargement des plans...</div>
  }

  return (
    <div className="space-y-6">
      {error && <div className="text-red-500 font-medium">{error}</div>}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plans d'abonnement</h1>
          <p className="text-muted-foreground mt-2">Gérez vos plans d'abonnement</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddPlan}>
              <Plus className="mr-2" size={20} />
              Créer un plan
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier le plan' : 'Créer un nouveau plan'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom du plan</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Mensuel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Durée en jours
                </label>
                <Input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) =>
                    setFormData({ ...formData, durationDays: e.target.value })
                  }
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Prix (MAD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="300"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                <label className="text-sm font-medium">Actif</label>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingId ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nom du plan</TableHead>
              <TableHead>Durée (jours)</TableHead>
              <TableHead>Prix (MAD)</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>{plan.durationDays}</TableCell>
                <TableCell>{plan.price.toLocaleString('fr-FR')}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-sm ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.isActive ? 'Oui' : 'Non'}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                        <Edit2 className="mr-2" size={16} />
                        Modifier
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleDeletePlan(plan.id)}
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
