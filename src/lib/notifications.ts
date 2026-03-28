/**
 * Browser Notification API wrapper for Obel.
 */

class NotificationSystem {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async send(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;
    
    const permission = Notification.permission;
    if (permission === 'default') {
      await this.requestPermission();
    }
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/obel.jpg',
        badge: '/favicon.svg',
        silent: true, // We handle sound separately
        ...options,
      });
    }
  }

  async schedule(title: string, triggerTimestamp: number, tag: string, options?: NotificationOptions) {
    if (!('Notification' in window)) return;
    const permission = await this.requestPermission();
    
    if (permission && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        // @ts-ignore - Experimental Web API: Notification Triggers
        if ('TimestampTrigger' in window) {
          // @ts-ignore
          const trigger = new window.TimestampTrigger(triggerTimestamp);
          
          // @ts-ignore
          await reg.showNotification(title, {
            icon: '/obel.jpg',
            badge: '/favicon.svg',
            tag,
            silent: false,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            showTrigger: trigger,
            ...options,
          } as any);
        }
      } catch (err) {
        console.log('Obel Notification System: Failed to schedule background notification', err);
      }
    }
  }

  async cancelScheduled(tag: string) {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const notifications = await reg.getNotifications({ tag });
        notifications.forEach(n => n.close());
      } catch (err) {
        // silently ignore error if SW fails to retrieve notifications
      }
    }
  }
}

export const notificationSystem = new NotificationSystem();
