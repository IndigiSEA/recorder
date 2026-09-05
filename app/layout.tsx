import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { CollectionProvider } from "@/providers/collection-provider"
import { I18nProvider } from "@/providers/i18n-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import type { Metadata, Viewport } from "next"
import { getLocale } from "next-intl/server"
import { Geist_Mono, Inter } from "next/font/google"
import APP_INFO from "./app-info.json"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Metadata to show in search results and messaging previews
export const metadata: Metadata = {
  applicationName: APP_INFO.name,
  title: {
    default: APP_INFO.defaultTitle,
    template: APP_INFO.titleTemplate,
  },
  description: APP_INFO.description,
  appleWebApp: {
    capable: false,
    statusBarStyle: "default",
    title: APP_INFO.defaultTitle,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    siteName: APP_INFO.name,
    title: {
      default: APP_INFO.defaultTitle,
      template: APP_INFO.titleTemplate,
    },
    description: APP_INFO.description,
    images: [
      {
        url: "/icons/logo-512x512.png",
        width: 512,
        height: 512,
      },
    ],
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
  const initialLocale = await getLocale()
  return (
    <html
      lang={initialLocale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable, "h-full overflow-hidden")}
    >
      <body className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <CollectionProvider>
            <ThemeProvider>
              <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
            </ThemeProvider>
          </CollectionProvider>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
