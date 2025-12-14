import Link from "next/link"
import Image from "next/image"
import { Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-4">
          <Image src="/GymWatch.svg" alt="GymWatch Logo" width={120} height={40} className="h-10 w-auto" priority />
        </div>

        {/* 404 Number */}
        <div className="relative">
          <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-primary/10 to-transparent blur-3xl" />
          <h1 className="relative text-[clamp(6rem,20vw,12rem)] font-bold leading-none tracking-tighter">
            <span className="bg-linear-to-br from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              404
            </span>
          </h1>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-balance">Page Not Found</h2>
          <p className="text-muted-foreground text-lg text-balance max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button asChild size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="gap-2 border-border/70 bg-transparent">
            <Link href="/dashboard">
              <Search className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="pt-12 flex justify-center gap-2 opacity-40">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
