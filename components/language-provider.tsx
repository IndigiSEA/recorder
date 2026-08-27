"use client"

import { NextIntlClientProvider } from "next-intl"
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

type LanguageContextValue = {
  t: ReturnType<typeof useTranslations>
  onError: (key: string, values?: Record<string, string>) => void
  onSuccess: (key: string, values?: Record<string, string>) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * LanguageProvider component provides the translator from next-intl and additional error/success toast functions.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const t = useTranslations()
  const onError = (key: string, values?: Record<string, string>) => toast.error(t(key, values))
  const onSuccess = (key: string, values?: Record<string, string>) => toast.success(t(key, values))

  const value = useMemo(() => ({ t, onError, onSuccess }), [t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useAppLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useAppLanguage must be used within NextIntlClientProvider")
  }
  return ctx
}
