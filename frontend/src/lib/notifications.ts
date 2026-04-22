/**
 * Browser Notification API wrapper for Obel.
 */

interface ExtendedNotificationOptions extends NotificationOptions {
  showTrigger?: unknown;
}

class NotificationSystem {
  private vapidPublicKey: string | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Helper to convert VAPID key for subscription
   */
  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async getVapidPublicKey() {
    if (this.vapidPublicKey) return this.vapidPublicKey;
    try {
      const res = await fetch('/api/notifications/vapid-public-key');
      const data = await res.json();
      this.vapidPublicKey = data.publicKey;
      return data.publicKey;
    } catch {
      return null;
    }
  }

  async subscribeToPush(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    try {
      const reg = await navigator.serviceWorker.ready;
      const publicKey = await this.getVapidPublicKey();
      if (!publicKey) return null;

      let sub = await reg.pushManager.getSubscription();
      
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey)
        });
      }

      // Send subscription to backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub })
      });

      return sub;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return null;
    }
  }

  async send(title: string, options?: ExtendedNotificationOptions) {
    if (!('Notification' in window)) return;
    
    const permission = Notification.permission;
    if (permission === 'default') {
      await this.requestPermission();
    }
    
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          icon: '/obel.png',
          badge: '/obel.png',
          vibrate: [200, 100, 200],
          renotify: true,
          tag: 'obel-immediate',
          ...options,
        } as NotificationOptions);
      } catch {
        // Fallback for non-SW environments or failures
        new Notification(title, {
          icon: '/obel.png',
          badge: '/obel.png',
          ...options,
        } as NotificationOptions);
      }
    }
  }

  async schedule(title: string, triggerTimestamp: number, tag: string, userId?: string, options?: ExtendedNotificationOptions) {
    if (!('Notification' in window)) return;
    const permission = await this.requestPermission();
    if (!permission) return;

    // 1. Try local TimestampTrigger first (Chrome only)
    if ('serviceWorker' in navigator && 'TimestampTrigger' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const WindowWithTrigger = window as unknown as { TimestampTrigger: new (t: number) => unknown };
        const trigger = WindowWithTrigger.TimestampTrigger ? new WindowWithTrigger.TimestampTrigger(triggerTimestamp) : null;
        
        if (trigger) {
          await reg.showNotification(title, {
            icon: '/obel.png',
            badge: '/obel.png',
            tag,
            silent: false,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            showTrigger: trigger,
            ...options,
          } as NotificationOptions);
          console.log(`[Notification] Scheduled LOCAL notification via Trigger API`);
          return;
        }
      } catch (err) {
        console.log('Local schedule failed, falling back to server-side push');
      }
    }

    // 2. Fallback: Server-Side Push (Robust, works even when app is closed)
    if (userId) {
      const delayMs = triggerTimestamp - Date.now();
      if (delayMs > 0) {
        try {
          await this.subscribeToPush(userId); // Ensure we have a sub
          await fetch('/api/notifications/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title,
              body: options?.body || '',
              tag,
              delayMs
            })
          });
          console.log(`[Notification] Scheduled SERVER-SIDE push notification`);
        } catch (err) {
          console.error('Failed to schedule server-side push:', err);
        }
      }
    }
  }

  async cancelScheduled(tag: string, userId?: string) {
    // Cancel local SW notifications
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const notifications = await reg.getNotifications({ tag });
        notifications.forEach(n => n.close());
      } catch {}
    }

    // Cancel server-side push
    if (userId) {
      try {
        await fetch('/api/notifications/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tag })
        });
      } catch {}
    }
  }
}

export const notificationSystem = new NotificationSystem();
