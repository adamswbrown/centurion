"use client"

import { useState, useEffect, useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  subscribeToPush,
  unsubscribeFromPush,
  unsubscribeAllPush,
  getPushSubscriptionStatus,
  sendTestNotification,
} from "@/app/actions/push-notifications"

interface UsePushNotificationsReturn {
  // State
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  subscriptionCount: number

  // Actions
  subscribe: () => void
  unsubscribe: () => void
  unsubscribeAll: () => void
  sendTest: () => void

  // Mutation states
  isSubscribing: boolean
  isUnsubscribing: boolean
  isSendingTest: boolean

  // Errors
  error: Error | null
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const queryClient = useQueryClient()

  // Check support and current permission on mount
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
    setIsSupported(supported)

    if ("Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Query subscription status from server
  const {
    data: subscriptionStatus,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["pushSubscriptionStatus"],
    queryFn: getPushSubscriptionStatus,
    enabled: isSupported,
    staleTime: 30000, // Cache for 30 seconds
  })

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Request permission first
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== "granted") {
        throw new Error("Notification permission denied")
      }

      // Get VAPID public key from server
      const response = await fetch("/api/push/vapid")
      const data = await response.json()

      if (!data.publicKey) {
        throw new Error("Push notifications not configured on server")
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      })

      // Get subscription keys
      const subscriptionJson = subscription.toJSON()
      if (!subscriptionJson.keys?.auth || !subscriptionJson.keys?.p256dh) {
        throw new Error("Failed to get subscription keys")
      }

      // Save to server
      await subscribeToPush({
        endpoint: subscription.endpoint,
        keys: {
          auth: subscriptionJson.keys.auth,
          p256dh: subscriptionJson.keys.p256dh,
        },
        userAgent: navigator.userAgent,
      })

      return subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptionStatus"] })
    },
  })

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        await unsubscribeFromPush(subscription.endpoint)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptionStatus"] })
    },
  })

  // Unsubscribe all mutation
  const unsubscribeAllMutation = useMutation({
    mutationFn: async () => {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }

      // Remove all server subscriptions
      await unsubscribeAllPush()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pushSubscriptionStatus"] })
    },
  })

  // Send test notification mutation
  const sendTestMutation = useMutation({
    mutationFn: sendTestNotification,
  })

  // Memoized callbacks
  const subscribe = useCallback(() => subscribeMutation.mutate(), [subscribeMutation])
  const unsubscribe = useCallback(() => unsubscribeMutation.mutate(), [unsubscribeMutation])
  const unsubscribeAll = useCallback(() => unsubscribeAllMutation.mutate(), [unsubscribeAllMutation])
  const sendTest = useCallback(() => sendTestMutation.mutate(), [sendTestMutation])

  return {
    // State
    isSupported,
    permission,
    isSubscribed: subscriptionStatus?.hasSubscription ?? false,
    isLoading,
    subscriptionCount: subscriptionStatus?.subscriptionCount ?? 0,

    // Actions
    subscribe,
    unsubscribe,
    unsubscribeAll,
    sendTest,

    // Mutation states
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending || unsubscribeAllMutation.isPending,
    isSendingTest: sendTestMutation.isPending,

    // Errors
    error:
      subscribeMutation.error ||
      unsubscribeMutation.error ||
      unsubscribeAllMutation.error ||
      queryError ||
      null,
  }
}

/**
 * Convert a base64 string to Uint8Array for the push subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
