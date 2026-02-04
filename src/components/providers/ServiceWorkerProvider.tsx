"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"

interface ServiceWorkerContextValue {
  isSupported: boolean
  isRegistered: boolean
  registration: ServiceWorkerRegistration | null
  isUpdateAvailable: boolean
  updateServiceWorker: () => void
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue>({
  isSupported: false,
  isRegistered: false,
  registration: null,
  isUpdateAvailable: false,
  updateServiceWorker: () => {},
})

export function useServiceWorker() {
  return useContext(ServiceWorkerContext)
}

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
      window.location.reload()
    }
  }, [registration])

  useEffect(() => {
    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })

        setRegistration(reg)
        setIsRegistered(true)

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
                setIsUpdateAvailable(true)
              }
            })
          }
        })

        // Check if there's already a waiting worker
        if (reg.waiting) {
          setIsUpdateAvailable(true)
        }

        // Handle controller change (after update)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // Page will reload when service worker activates
        })

        console.log("Service Worker registered:", reg.scope)
      } catch (error) {
        console.error("Service Worker registration failed:", error)
        setIsRegistered(false)
      }
    }

    registerServiceWorker()

    // Check for updates periodically
    const checkForUpdates = setInterval(() => {
      registration?.update()
    }, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(checkForUpdates)
  }, [registration])

  return (
    <ServiceWorkerContext.Provider
      value={{
        isSupported,
        isRegistered,
        registration,
        isUpdateAvailable,
        updateServiceWorker,
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  )
}
