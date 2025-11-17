'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    gymName: '',
    email: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const router = useRouter()

  const registerMutation = useMutation({
    mutationFn: async () => {
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
        throw new Error(data.error || 'Une erreur est survenue')
      }

      return data
    },
    onSuccess: () => {
      toast.success('Compte créé avec succès !')
      router.push('/login?registered=true')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      setError(message)
      toast.error(message)
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.adminPassword !== formData.confirmPassword) {
      const mismatchMessage = 'Les mots de passe ne correspondent pas'
      setError(mismatchMessage)
      toast.error(mismatchMessage)
      return
    }

    registerMutation.mutate()
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
            <div>
              <Label htmlFor="gymName">Nom de la salle</Label>
              <Input
                id="gymName"
                name="gymName"
                placeholder="FitZone Casablanca"
                value={formData.gymName}
                onChange={handleChange}
                required
                disabled={registerMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="gymEmail">Email de la salle</Label>
              <Input
                id="gymEmail"
                name="email"
                type="email"
                placeholder="contact@salle.ma"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={registerMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="adminEmail">Email administrateur</Label>
              <Input
                id="adminEmail"
                name="adminEmail"
                type="email"
                placeholder="admin@salle.ma"
                value={formData.adminEmail}
                onChange={handleChange}
                required
                disabled={registerMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="adminPassword">Mot de passe</Label>
              <Input
                id="adminPassword"
                name="adminPassword"
                type="password"
                placeholder="••••••••"
                value={formData.adminPassword}
                onChange={handleChange}
                required
                disabled={registerMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={registerMutation.isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Inscription en cours...' : 'Créer un compte'}
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
