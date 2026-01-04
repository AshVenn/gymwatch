"use client"

import { useState, type FormEvent } from "react"
import { Mail, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ContactFormCopy = {
  title: string
  description: string
  fields: {
    name: { label: string; placeholder: string }
    email: { label: string; placeholder: string }
    company: { label: string; placeholder: string }
    sites: { label: string; placeholder: string }
    message: { label: string; placeholder: string }
  }
  actions: { send: string; emailDirect: string }
  toast: { success: string; error: string }
}

type ContactFormProps = {
  copy: ContactFormCopy
  supportMailto: string
}

export function ContactForm({ copy, supportMailto }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      sites: String(formData.get("sites") ?? ""),
      message: String(formData.get("message") ?? ""),
      botField: String(formData.get("botField") ?? ""),
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      const message = response.status === 429 ? copy.toast.error : data.error || copy.toast.error
      if (!response.ok) {
        throw new Error(message)
      }

      toast.success(copy.toast.success)
      form.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.toast.error
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{copy.title}</CardTitle>
        <CardDescription className="leading-relaxed">{copy.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="botField"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{copy.fields.name.label}</Label>
              <Input
                id="name"
                name="name"
                placeholder={copy.fields.name.placeholder}
                className="transition-all duration-200 focus:shadow-sm"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{copy.fields.email.label}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={copy.fields.email.placeholder}
                className="transition-all duration-200 focus:shadow-sm"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">{copy.fields.company.label}</Label>
              <Input
                id="company"
                name="company"
                placeholder={copy.fields.company.placeholder}
                className="transition-all duration-200 focus:shadow-sm"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sites">{copy.fields.sites.label}</Label>
              <Input
                id="sites"
                name="sites"
                placeholder={copy.fields.sites.placeholder}
                className="transition-all duration-200 focus:shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{copy.fields.message.label}</Label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              placeholder={copy.fields.message.placeholder}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-all duration-200 focus-visible:border-ring focus-visible:shadow-sm focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              className="gap-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              disabled={isSubmitting}
            >
              {copy.actions.send}
              <Send className="h-4 w-4" aria-hidden />
            </Button>

            <Button
              asChild
              type="button"
              variant="outline"
              className="gap-2 bg-transparent transition-all duration-300 hover:bg-primary/5"
            >
              <a href={supportMailto}>
                {copy.actions.emailDirect}
                <Mail className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
