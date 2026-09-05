"use client"

import { NextIntlClientProvider, useTranslations } from "next-intl"
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"
import messages from "../messages/en.d.json"
import enMessages from "../messages/en.json"
import msMessages from "../messages/ms.json"

export type Translator = ReturnType<typeof useTranslations<never>>

const supportedLocales = ["en", "ms"] as const

export type SupportedLocale = (typeof supportedLocales)[number]

type LocaleContextValue = {
  locale: SupportedLocale
  setLocale: (nextLocale: SupportedLocale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

// Check if a given value is a supported locale.
function isSupportedLocale(value: string | null): value is SupportedLocale {
  return !!value && (supportedLocales as readonly string[]).includes(value)
}

// Read the preferred locale from localStorage, falling back to a default if not found or invalid.
function readPreferredLocale(fallback: SupportedLocale): SupportedLocale {
  try {
    const stored = localStorage.getItem("locale")
    if (isSupportedLocale(stored)) return stored
  } catch (e) {
    console.error("Failed to read preferred locale from localStorage", e)
  }

  return fallback
}

// Get the appropriate messages for the given locale.
function getMessages(locale: SupportedLocale) {
  return (locale === "ms" ? msMessages : enMessages) as typeof messages // Use the messages type for type safety
}

/**
 * I18nProvider component provides internationalisation support for the application for switching between languages.
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale: SupportedLocale }) {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale)

  useEffect(() => {
    // Set the initial locale from localStorage only once on mount.
    setLocale(readPreferredLocale(initialLocale))
  }, [initialLocale])

  const updateLocale = (newLocale: SupportedLocale) => {
    setLocale(newLocale)

    try {
      localStorage.setItem("locale", newLocale)
    } catch (e) {
      console.error("Failed to set preferred locale in localStorage", e)
    }
  }

  const value = useMemo(() => ({ locale, setLocale: updateLocale }), [locale])

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={getMessages(locale)} timeZone="Asia/Kuala_Lumpur">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}

export function useAppLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useAppLocale must be used within I18nProvider")
  }
  return ctx
}
