"use client"

import { useTranslations } from "next-intl"
import { createContext, ReactNode, useContext, useMemo } from "react"
import { toast } from "sonner"

type TranslationKeyPair = string | [string, Record<string, string>]

type LanguageContextValue = {
  t: ReturnType<typeof useTranslations>
  onError: (key: string, values?: Record<string, string>) => ReturnType<typeof toast.error>
  onSuccess: (key: string, values?: Record<string, string>) => ReturnType<typeof toast.success>
  onPromise: <Data = unknown>(
    promise: Promise<Data> | (() => Promise<Data>),
    options: {
      loading: TranslationKeyPair
      success: TranslationKeyPair | ((data: Data) => TranslationKeyPair)
      error: TranslationKeyPair | ((error: unknown) => TranslationKeyPair)
    }
  ) => ReturnType<typeof toast.promise<Data>>
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * LanguageProvider component provides the translator from next-intl and additional error/success toast functions.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const t = useTranslations()
  const onError = (key: string, values?: Record<string, string>) => toast.error(t(key, values))
  const onSuccess = (key: string, values?: Record<string, string>) => toast.success(t(key, values))

  function onPromise<Data = unknown>(
    promise: Promise<Data> | (() => Promise<Data>),
    options: {
      loading: TranslationKeyPair
      success: TranslationKeyPair | ((data: Data) => TranslationKeyPair)
      error: TranslationKeyPair | ((error: unknown) => TranslationKeyPair)
    }
  ) {
    return toast.promise(promise, {
      loading: typeof options.loading === "string" ? t(options.loading) : t(...options.loading),
      success: (data) => {
        const translationKeyPair = typeof options.success === "function" ? options.success(data) : options.success
        return typeof translationKeyPair === "string" ? t(translationKeyPair) : t(...translationKeyPair)
      },
      error: (error) => {
        const translationKeyPair = typeof options.error === "function" ? options.error(error) : options.error
        return typeof translationKeyPair === "string" ? t(translationKeyPair) : t(...translationKeyPair)
      },
    })
  }

  const value = useMemo(() => ({ t, onError, onSuccess, onPromise }), [t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useAppLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useAppLanguage must be used within NextIntlClientProvider")
  }
  return ctx
}
