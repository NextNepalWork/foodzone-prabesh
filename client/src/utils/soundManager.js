// Single sound engine for all staff surfaces (POS, Reception, Kitchen TV,
// Staff dashboard, Admin). Replaces the old audioAlerts / audioNotifications /
// mobileAudioManager trio.
//
// Browsers block audio until the user interacts with the page, so the first
// pointer/key event "unlocks" playback. Pages can show an enable-sound banner
// until `isUnlocked()` turns true.
//
// Also listens for messages from the service worker:
//   { type: 'PLAY_ALERT', sound, tag }  → play the sound (debounced per tag)
//   { type: 'NAVIGATE', url }           → notification click deep-link

const SOUNDS = {
  // Generic order alerts intentionally use the table chime. There are only
  // two new-order sounds on staff surfaces: table/takeaway and delivery.
  'new-order': '/sounds/table-order.mp3',
  'table-order': '/sounds/table-order.mp3',
  'delivery-order': '/sounds/delivery-order.mp3',
  'kitchen-alarm': '/sounds/kitchen-alarm.mp3',
};

const DEBOUNCE_MS = 3000; // socket + push for the same order must not double-ring

class SoundManager {
  constructor() {
    this.audio = {};
    this.unlocked = false;
    this.initialized = false;
    this.lastPlayed = new Map(); // tag -> timestamp
    this.listeners = new Set();
  }

  // Call once (App.js). Installs the unlock handler and the SW message bridge.
  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Preload
    Object.entries(SOUNDS).forEach(([name, src]) => {
      try {
        const a = new Audio(src);
        a.preload = 'auto';
        a.volume = 1;
        this.audio[name] = a;
      } catch (e) { /* no Audio support */ }
    });

    // One-time gesture unlock: play+pause silently to satisfy autoplay policy
    const unlock = () => {
      if (this.unlocked) return;
      const a = this.audio['new-order'];
      if (a) {
        a.volume = 0;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = 1;
            this.setUnlocked(true);
          })
          .catch(() => { /* still locked; next gesture retries */ });
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });

    // Bridge from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.type === 'PLAY_ALERT') {
          this.play(data.sound || 'new-order', data.tag);
        } else if (data.type === 'NAVIGATE' && data.url) {
          const target = new URL(data.url, window.location.origin);
          if (window.location.pathname + window.location.search !== target.pathname + target.search) {
            window.location.assign(target.href);
          }
        }
      });
    }
  }

  setUnlocked(value) {
    this.unlocked = value;
    try { localStorage.setItem('soundUnlocked', value ? 'true' : 'false'); } catch (e) {}
    this.listeners.forEach((fn) => fn(value));
  }

  isUnlocked() {
    return this.unlocked;
  }

  // Subscribe to unlock-state changes (for enable-sound banners)
  onUnlockChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Play a named alert. `tag` dedupes the same event arriving via socket AND
  // push within a few seconds.
  play(name = 'new-order', tag = null) {
    const key = tag || name;
    const now = Date.now();
    const last = this.lastPlayed.get(key) || 0;
    if (now - last < DEBOUNCE_MS) return;
    this.lastPlayed.set(key, now);

    const a = this.audio[name] || this.audio['new-order'];
    if (!a) return;
    try {
      // 1 is the maximum volume exposed by HTMLMediaElement. The website
      // cannot override the device/OS master volume or a muted browser tab.
      a.volume = 1;
      a.currentTime = 0;
      a.play()
        .then(() => { if (!this.unlocked) this.setUnlocked(true); })
        .catch((err) => {
          // Autoplay blocked — surface stays silent until the user interacts
          console.warn(`Sound "${name}" blocked (needs user gesture):`, err.name);
        });
    } catch (e) { /* ignore */ }
  }

  // Explicit user action from an enable-sound button: unlock + test chime
  enable() {
    const a = this.audio['new-order'];
    if (!a) return Promise.resolve(false);
    a.currentTime = 0;
    a.volume = 1;
    return a.play()
      .then(() => { this.setUnlocked(true); return true; })
      .catch(() => false);
  }
}

const soundManager = new SoundManager();
export default soundManager;
