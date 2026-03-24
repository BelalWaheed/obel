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
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        silent: true, // We handle sound separately
        ...options,
      });
    }
  }
}

export const notificationSystem = new NotificationSystem();
