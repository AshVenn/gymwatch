'use client'
//(dashboard)/dashboard/settings/page.tsx
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const [gym, setGym] = useState<GymData | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (session?.user?.gymId) {
      fetchGymData()
    }
  }, [session])

  const fetchGymData = async () => {
    try {
      const response = await fetch('/api/gym')
      const data = await response.json()
      setGym(data)
      setFormData({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
      })
    } catch (error) {
      console.error('Failed to fetch gym data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/gym', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage('Paramètres mis à jour avec succès')
        await fetchGymData()
      } else {
        setMessage('Une erreur est survenue lors de la mise à jour')
      }
    } catch (error) {
      setMessage('Une erreur est survenue')
      console.error('Failed to update gym data:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.includes('succès')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {message}
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

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
