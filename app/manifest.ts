import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import APP_INFO from "./app-info.json"

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const requestHeaders = await headers()
  const userAgent = requestHeaders.get("user-agent") ?? ""
  const isAppleDevice = /Macintosh|iPhone|iPad|iPod/.test(userAgent)

  return {
    name: APP_INFO.name,
    short_name: APP_INFO.shortName,
    description: APP_INFO.description,
    icons: [
      {
        src: "/icons/logo-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/logo-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/logo-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    start_url: "/",
    display: isAppleDevice ? "browser" : "standalone",
    orientation: "portrait",
    screenshots: [
      {
        src: "/screenshots/mobile_home_page_light.png",
        sizes: "1082x2402",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/mobile_home_page_dark.png",
        sizes: "1082x2402",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    categories: ["research", "utilities"],
  }
}
