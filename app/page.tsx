'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 text-white">
      <nav className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">GymWatch</div>
          <div className="space-x-4">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Se connecter
            </Button>
            <Button onClick={() => router.push('/register')}>
              Créer un compte
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">
            Gérez vos abonnements de salle de sport
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            GymWatch est la plateforme complète pour gérer vos membres, plans d'abonnement et surveiller vos revenus en temps réel.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button size="lg" onClick={() => router.push('/login')}>
              Se connecter maintenant
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/register')}>
              Créer une salle de sport
            </Button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h3 className="text-lg font-semibold mb-3">📊 Tableau de bord</h3>
            <p className="text-slate-300">
              Visualisez vos revenus, membres actifs et statistiques en temps réel.
            </p>
          </Card>
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h3 className="text-lg font-semibold mb-3">👥 Gestion des membres</h3>
            <p className="text-slate-300">
              Gérez facilement vos membres, leurs abonnements et leurs informations.
            </p>
          </Card>
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h3 className="text-lg font-semibold mb-3">📋 Plans flexibles</h3>
            <p className="text-slate-300">
              Créez des plans d'abonnement personnalisés adaptés à votre salle.
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
