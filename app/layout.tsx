import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'
import { AuthProvider } from './providers/session-provider'
import { ReactQueryProvider } from './providers/react-query-provider'
import { Toaster } from '@/components/ui/sonner'

const siteUrl = 'https://www.gymwatch.fr'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GymWatch – Gestion moderne des salles de sport',
    template: '%s | GymWatch',
  },
  description:
    "GymWatch aide les salles de sport à piloter leurs abonnements, leurs membres et leurs revenus grâce à un tableau de bord intelligent.",
  applicationName: 'GymWatch',
  generator: 'v0.app',
  keywords: ['salle de sport', 'abonnements', 'fitness', 'gestion', 'logiciel'],
  authors: [{ name: 'GymWatch' }],
  creator: 'GymWatch',
  publisher: 'GymWatch',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'GymWatch – Centralisez la gestion de vos clubs de fitness',
    description:
      'Tableau de bord multi-locataires pour suivre vos membres, abonnements et revenus en temps réel.',
    url: siteUrl,
    siteName: 'GymWatch',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/hero-grid.svg',
        width: 1600,
        height: 1200,
        alt: 'Motif abstrait GymWatch',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@gymwatch',
    title: 'GymWatch – La solution de gestion des salles de sport',
    description:
      'Automatisez vos abonnements, simplifiez vos opérations et inspirez vos membres avec GymWatch.',
    images: ['/hero-grid.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ReactQueryProvider>
            <Toaster />
            <main>{children}</main>
          </ReactQueryProvider>
        </AuthProvider>

        <Analytics />
      </body>
    </html>
  )
}
