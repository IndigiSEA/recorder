import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist, StaleWhileRevalidate } from "serwist"

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const RSC_CACHE = "pages-rsc"

// Define the runtime caching strategy for RSC requests. This uses a Stale-While-Revalidate strategy, which serves the
// cached response immediately and then fetches an updated response in the background to update the cache.
// The `ignoreSearch` option is set to true to ignore query parameters when matching requests in the cache.
const rscStrategy = new StaleWhileRevalidate({
  cacheName: RSC_CACHE,
  matchOptions: { ignoreSearch: true },
})

self.addEventListener("install", (event) => {
  event.waitUntil(
    rscStrategy.handle({
      event,
      request: new Request("/recorder", { headers: { RSC: "1" } }),
    })
  )
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.searchParams.has("_rsc"),
      handler: rscStrategy,
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()
