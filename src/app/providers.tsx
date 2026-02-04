"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
    </QueryClientProvider>
  )
}
