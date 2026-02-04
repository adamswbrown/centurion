// Centurion PWA Service Worker
// Handles caching, push notifications, and background sync

const CACHE_NAME = "centurion-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/client/dashboard",
  "/offline",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache assets but don't fail install if some are missing
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith("centurion-"))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip non-http(s) requests
  if (!event.request.url.startsWith("http")) return;

  // Skip API requests - always go to network
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try cache first
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // For navigation requests, return offline page
        if (event.request.mode === "navigate") {
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;
        }

        // Return a basic offline response
        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
        });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("Failed to parse push data:", e);
    return;
  }

  const {
    title = "Centurion",
    body = "",
    icon = "/icons/icon-192x192.png",
    badge = "/icons/badge-72x72.png",
    tag = "centurion-notification",
    data: notificationData = {},
    actions = [],
    requireInteraction = false,
    silent = false,
  } = data;

  const options = {
    body,
    icon,
    badge,
    tag,
    data: notificationData,
    actions,
    vibrate: silent ? [] : [200, 100, 200],
    requireInteraction,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";
  const action = event.action;

  // Handle specific actions
  if (action === "dismiss") {
    // Just close notification (already done above)
    return;
  }

  // Default: open the URL
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close event - track dismissals
self.addEventListener("notificationclose", (event) => {
  // Could send analytics here if needed
  console.log("Notification closed:", event.notification.tag);
});

// Background sync for offline entries
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-entries") {
    event.waitUntil(syncOfflineEntries());
  }
});

async function syncOfflineEntries() {
  try {
    const cache = await caches.open("centurion-offline-entries");
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await cache.match(request);
        if (!response) continue;

        const data = await response.json();

        const syncResponse = await fetch("/api/entries/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (syncResponse.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error("Sync failed for entry:", error);
      }
    }
  } catch (error) {
    console.error("Background sync error:", error);
  }
}

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reminders") {
    event.waitUntil(checkScheduledReminders());
  }
});

async function checkScheduledReminders() {
  // This runs periodically when the browser allows
  // Used for checking if any local reminders should trigger
  console.log("Periodic sync: checking reminders");
}

// Message handler for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
