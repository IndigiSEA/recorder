import withSerwistInit from "@serwist/next"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
})

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default withNextIntl(withSerwist(nextConfig))
