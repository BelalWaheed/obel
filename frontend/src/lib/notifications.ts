/**
 * Browser Notification API wrapper for Obel.
 */

interface ExtendedNotificationOptions extends NotificationOptions {
  showTrigger?: unknown;
}

class NotificationSystem {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
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

  async schedule(title: string, triggerTimestamp: number, tag: string, options?: ExtendedNotificationOptions) {
    if (!('Notification' in window)) return;
    const permission = await this.requestPermission();
    
    if (permission && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ('TimestampTrigger' in window) {
          const WindowWithTrigger = window as unknown as { TimestampTrigger: new (t: number) => unknown };
          const trigger = WindowWithTrigger.TimestampTrigger ? new WindowWithTrigger.TimestampTrigger(triggerTimestamp) : null;
          
          if (!trigger) return;
          await reg.showNotification(title, {
            icon: '/obel.png',
            badge: '/obel.png',
            tag,
            silent: false,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            showTrigger: trigger,
            ...options,
          } as NotificationOptions);
        }
      } catch {
        console.log('Obel Notification System: Failed to schedule background notification');
      }
    }
  }

  async cancelScheduled(tag: string) {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const notifications = await reg.getNotifications({ tag });
        notifications.forEach(n => n.close());
      } catch {
        // silently ignore error if SW fails to retrieve notifications
      }
    }
  }
}

export const notificationSystem = new NotificationSystem();
