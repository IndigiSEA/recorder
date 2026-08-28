import { I18nProvider } from "@/components/i18n-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import type { Metadata, Viewport } from "next"
import { getLocale } from "next-intl/server"
import { Geist_Mono, Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Metadata to show in search results and messaging previews
const APP_NAME = "IndigiSEA Recorder"
const APP_DEFAULT_TITLE = "IndigiSEA Recorder"
const APP_TITLE_TEMPLATE = "%s - IndigiSEA Recorder"
const APP_DESCRIPTION = "Recording words from the indigenous community"

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
}

// Root layout component for the entire application
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const initialLocale = locale === "ms" ? "ms" : "en"

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
