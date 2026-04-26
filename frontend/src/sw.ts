/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any }

const sw = self

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
sw.skipWaiting()
clientsClaim()

// ── SW-SIDE TIMER ────────────────────────────────────────────────────────────
// Runs setInterval inside the SW so it survives tab throttling / backgrounding.
// The main thread sends START_SW_TIMER / STOP_SW_TIMER messages.
// The SW broadcasts TIMER_TICK every second to all open clients.

let swTimerInterval: ReturnType<typeof setInterval> | null = null

function broadcastToClients(payload: Record<string, unknown>) {
  sw.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => {
      clients.forEach((client) => client.postMessage(payload))
    })
}

function stopSWTimer() {
  if (swTimerInterval !== null) {
    clearInterval(swTimerInterval)
    swTimerInterval = null
  }
}

sw.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as {
    type: string
    expectedEndTime?: number
  }

  if (data?.type === 'START_SW_TIMER') {
    // Always clear any existing interval first
    stopSWTimer()

    const expectedEndTime = data.expectedEndTime
    if (!expectedEndTime) return

    // Tick every second; the client recalculates remaining from wall clock
    swTimerInterval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((expectedEndTime - now) / 1000))

      broadcastToClients({ type: 'SW_TIMER_TICK', remaining, expectedEndTime })

      if (remaining === 0) {
        stopSWTimer()
        broadcastToClients({ type: 'SW_TIMER_EXPIRED', expectedEndTime })
      }
    }, 1000)
  }

  if (data?.type === 'STOP_SW_TIMER') {
    stopSWTimer()
  }
})

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
sw.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Obel'
    const options: any = {
      body: data.body || 'Timer complete!',
      icon: '/obel.png',
      badge: '/obel.png',
      tag: data.tag || 'obel-timer',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        url:
          sw.location.origin +
          (data.tag === 'obel-timer' ? '/pomodoro' : '/'),
      },
    }

    event.waitUntil(sw.registration.showNotification(title, options))
  } catch (err) {
    console.error('[SW] Push notification error:', err)
  }
})

// ── NOTIFICATION CLICK ───────────────────────────────────────────────────────
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const urlToOpen =
    (event.notification.data as { url?: string })?.url ?? sw.location.origin

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          const c = client as WindowClient
          if (c.url === urlToOpen && 'focus' in c) return c.focus()
        }
        if (sw.clients.openWindow) return sw.clients.openWindow(urlToOpen)
      })
  )
})