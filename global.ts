import { SupportedLocale } from "@/components/i18n-provider"
import formats from "@/i18n/request"
import messages from "@/messages/en.d.json"

declare module "next-intl" {
  interface AppConfig {
    Locale: SupportedLocale
    Messages: typeof messages
    Formats: typeof formats
  }
}
