"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type Locale = "en" | "fr" | "ar"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const copy = {
  en: {
    button: "Open GymWatch help",
    close: "Close help",
    title: "GymWatch help",
    subtitle: "Ask about setup, members, QR access, payments, and reports.",
    greeting: "Hi, I can help you use GymWatch. What best describes you?",
    placeholder: "Ask a question...",
    send: "Send",
    thinking: "Checking GymWatch help...",
    unavailable: "AI help is temporarily unavailable.",
    suggestions: ["Gym owner", "Gym staff", "Member", "I am exploring GymWatch"],
  },
  fr: {
    button: "Ouvrir l'aide GymWatch",
    close: "Fermer l'aide",
    title: "Aide GymWatch",
    subtitle: "Posez une question sur la configuration, les membres, les QR, les paiements ou les rapports.",
    greeting: "Bonjour, je peux vous aider a utiliser GymWatch. Quel profil vous correspond le mieux ?",
    placeholder: "Posez une question...",
    send: "Envoyer",
    thinking: "Consultation de l'aide GymWatch...",
    unavailable: "L'aide IA est temporairement indisponible.",
    suggestions: ["Proprietaire de salle", "Equipe de salle", "Membre", "Je decouvre GymWatch"],
  },
  ar: {
    button: "فتح مساعدة GymWatch",
    close: "إغلاق المساعدة",
    title: "مساعدة GymWatch",
    subtitle: "اسأل عن الإعداد، الأعضاء، رموز QR، المدفوعات، والتقارير.",
    greeting: "مرحبا، يمكنني مساعدتك في استخدام GymWatch. ما الوصف الأقرب لك؟",
    placeholder: "اكتب سؤالك...",
    send: "إرسال",
    thinking: "يتم البحث في مساعدة GymWatch...",
    unavailable: "المساعدة بالذكاء الاصطناعي غير متاحة مؤقتا.",
    suggestions: ["مالك قاعة رياضية", "موظف في القاعة", "عضو", "أتعرف على GymWatch"],
  },
} satisfies Record<Locale, {
  button: string
  close: string
  title: string
  subtitle: string
  greeting: string
  placeholder: string
  send: string
  thinking: string
  unavailable: string
  suggestions: string[]
}>

function normalizeLocale(locale: string): Locale {
  if (locale === "ar" || locale === "en" || locale === "fr") return locale
  return "fr"
}

export function HelpbotWidget() {
  const locale = normalizeLocale(useLocale())
  const text = copy[locale]
  const isRtl = locale === "ar"
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: text.greeting },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages((current) =>
      current.length === 1 && current[0]?.role === "assistant"
        ? [{ role: "assistant", content: text.greeting }]
        : current,
    )
  }, [text.greeting])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, open, loading])

  async function sendMessage(raw: string) {
    const question = raw.trim()
    if (!question || loading) return

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/helpbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: nextMessages.slice(-8),
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { answer?: string; message?: string }
      if (!response.ok || !body.answer) {
        throw new Error(body.message || text.unavailable)
      }

      setMessages((current) => [...current, { role: "assistant", content: body.answer! }])
    } catch (error) {
      const message = error instanceof Error ? error.message : text.unavailable
      setMessages((current) => [...current, { role: "assistant", content: message }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(input)
    }
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "fixed bottom-4 z-50 flex flex-col items-end gap-3",
        isRtl ? "left-4 items-start" : "right-4",
      )}
    >
      {open ? (
        <section className="animate-scale-in flex h-[min(620px,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Bot className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold leading-5 tracking-normal">{text.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{text.subtitle}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={text.close}
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </header>

          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className={cn(
                    "flex",
                    message.role === "user"
                      ? isRtl
                        ? "justify-start"
                        : "justify-end"
                      : isRtl
                        ? "justify-end"
                        : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-background",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {messages.length === 1 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {text.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
                      disabled={loading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              {loading ? (
                <div className={cn("flex", isRtl ? "justify-end" : "justify-start")}>
                  <div className="inline-flex max-w-[82%] items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>{text.thinking}</span>
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="border-t border-border/70 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={text.placeholder}
                rows={1}
                className="min-h-10 max-h-28 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                aria-label={text.send}
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl"
              >
                {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <Button
        type="button"
        size="icon-lg"
        aria-label={text.button}
        onClick={() => setOpen((value) => !value)}
        className="size-14 rounded-full shadow-xl"
      >
        <MessageCircle className="size-6" aria-hidden />
      </Button>
    </div>
  )
}
