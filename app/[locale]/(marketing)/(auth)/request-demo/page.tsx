import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { AppLocale } from "@/i18n/routing"
import RequestDemoForm from "@/components/auth/request-demo-form"

type PageProps = {
  params: Promise<{ locale: AppLocale }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "requestDemoHome.metadata" })

  return {
    title: t("title"),
    description: t("description"),
    keywords: (t.raw("keywords") as string[]) ?? undefined,
  }
}

export default async function RequestDemoPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "requestDemoHome" })

  const copy = {
    hero: {
      badge: t("hero.badge"),
      trustChip: t("hero.trustChip"),
      title: t("hero.title"),
      subtitle: t("hero.subtitle"),
    },
    left: {
      title: t("left.title"),
      description: t("left.description"),
      cards: {
        verify: { title: t("left.cards.verify.title"), desc: t("left.cards.verify.desc") },
        invite: { title: t("left.cards.invite.title"), desc: t("left.cards.invite.desc") },
        local: { title: t("left.cards.local.title"), desc: t("left.cards.local.desc") },
        speed: { title: t("left.cards.speed.title"), desc: t("left.cards.speed.desc") },
      },
      hint: {
        title: t("left.hint.title"),
        desc: t("left.hint.desc"),
      },
    },
    plans: {
      basic: { title: t("plans.basic.title"), desc: t("plans.basic.desc") },
      pro: { title: t("plans.pro.title"), desc: t("plans.pro.desc") },
      enterprise: { title: t("plans.enterprise.title"), desc: t("plans.enterprise.desc") },
    },
    form: {
      title: t("form.title"),
      description: t("form.description"),
      sideHint: t("form.sideHint"),
      disclaimer: t("form.disclaimer"),
      actions: {
        submit: t("form.actions.submit"),
        sending: t("form.actions.sending"),
      },
      fields: {
        gymName: { label: t("form.fields.gymName.label"), placeholder: t("form.fields.gymName.placeholder") },
        gymEmail: { label: t("form.fields.gymEmail.label"), placeholder: t("form.fields.gymEmail.placeholder") },
        phone: { label: t("form.fields.phone.label"), placeholder: t("form.fields.phone.placeholder") },
        address: { label: t("form.fields.address.label"), placeholder: t("form.fields.address.placeholder") },
        city: { label: t("form.fields.city.label"), placeholder: t("form.fields.city.placeholder") },
        country: { label: t("form.fields.country.label"), placeholder: t("form.fields.country.placeholder") },
        adminFirstName: { label: t("form.fields.adminFirstName.label"), placeholder: t("form.fields.adminFirstName.placeholder") },
        adminLastName: { label: t("form.fields.adminLastName.label"), placeholder: t("form.fields.adminLastName.placeholder") },
        adminEmail: { label: t("form.fields.adminEmail.label"), placeholder: t("form.fields.adminEmail.placeholder") },
        plan: { label: t("form.fields.plan.label"), placeholder: t("form.fields.plan.placeholder") },
        message: { label: t("form.fields.message.label"), placeholder: t("form.fields.message.placeholder") },
      },
    },
    toast: {
      success: t("toast.success"),
      errorFallback: t("toast.errorFallback"),
    },
    validation: {
      required: t("validation.required"),
      email: t("validation.email"),
      phone: t("validation.phone"),
      messageMax: t("validation.messageMax"),
    },
  } as const

  return <RequestDemoForm locale={locale} copy={copy} />
}
