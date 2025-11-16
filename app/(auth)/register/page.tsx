'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    gymName: '',
    email: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymName: formData.gymName,
          gymEmail: formData.email,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue')
      } else {
        router.push('/login?registered=true')
      }
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Créer une salle de sport</CardTitle>
          <CardDescription>
            Inscrivez votre salle de sport à GymWatch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Nom de la salle</label>
              <Input
                name="gymName"
                placeholder="FitZone Casablanca"
                value={formData.gymName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email de la salle</label>
              <Input
                name="email"
                type="email"
                placeholder="contact@salle.ma"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email administrateur</label>
              <Input
                name="adminEmail"
                type="email"
                placeholder="admin@salle.ma"
                value={formData.adminEmail}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <Input
                name="adminPassword"
                type="password"
                placeholder="••••••••"
                value={formData.adminPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
              <Input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Inscription en cours...' : 'Créer un compte'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{' '}
            <a href="/login" className="text-primary hover:underline">
              Se connecter
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
