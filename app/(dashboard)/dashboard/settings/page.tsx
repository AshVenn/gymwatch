'use client'
//(dashboard)/dashboard/settings/page.tsx
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'

interface GymData {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  })

  const gymKey = useMemo(() => ['gym', session?.user?.gymId ?? 'no-gym'] as const, [session?.user?.gymId])

  const {
    data: gym,
    isLoading,
    isError,
  } = useQuery<GymData>({
    queryKey: gymKey,
    enabled: Boolean(session?.user?.gymId),
    queryFn: async () => {
      const response = await fetch('/api/gym')

      if (!response.ok) {
        throw new Error('Impossible de charger les paramètres du gymnase')
      }

      return response.json()
    },
  })

  useEffect(() => {
    if (gym) {
      setFormData({
        name: gym.name,
        email: gym.email,
        phone: gym.phone || '',
        address: gym.address || '',
        city: gym.city || '',
        country: gym.country || '',
      })
    }
  }, [gym])

  const updateGymMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/gym', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de la mise à jour')
      }

      return data
    },
    onSuccess: () => {
      toast.success('Paramètres mis à jour avec succès')
      queryClient.invalidateQueries(gymKey)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue')
    },
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = () => {
    updateGymMutation.mutate()
  }

  if (isLoading) {
    return <div>Chargement des paramètres...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-2">Gérez les informations de votre salle</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de la salle de sport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && (
            <div className="p-3 rounded-md text-sm bg-red-100 text-red-800">
              Une erreur est survenue lors du chargement
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Nom de la salle</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Nom de la salle de sport"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="contact@salle.ma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Téléphone</label>
            <Input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+212..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Adresse</label>
            <Input
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Adresse complète"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ville</label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Ville"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pays</label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Pays"
            />
          </div>

          <Button onClick={handleSubmit} disabled={updateGymMutation.isPending} className="w-full">
            {updateGymMutation.isPending ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
