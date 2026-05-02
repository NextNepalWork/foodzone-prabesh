// Enhanced Mobile Audio Manager for PWA - Full Volume + Background Support
class MobileAudioManager {
  constructor() {
    this.isEnabled = true;
    this.volume = 1.0; // Maximum volume
    this.wakeLock = null;
    this.audioContext = null;
    this.isBackgroundActive = false;
    this.notificationQueue = [];
    
    this.initializeAudio();
    this.initializeMobileSupport();
    this.setupBackgroundHandling();
  }

  async initializeAudio() {
    try {
      // Create AudioContext with maximum settings for mobile
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Resume context immediately for mobile
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🔊 Mobile Audio Context initialized at maximum volume');
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  }

  async initializeMobileSupport() {
    // Request all necessary permissions for mobile PWA
    await this.requestNotificationPermission();
    await this.requestWakeLock();
    await this.unlockAudioForMobile();
    
    // Handle mobile-specific events
    document.addEventListener('touchstart', this.handleUserInteraction.bind(this), { once: true });
    document.addEventListener('click', this.handleUserInteraction.bind(this), { once: true });
  }

  async handleUserInteraction() {
    // Unlock audio context on first user interaction (required for mobile)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🔊 Audio unlocked via user interaction');
    }
  }

  async requestNotificationPermission() {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('🔔 Notification permission granted for locked screen alerts');
          return true;
        }
      }
    } catch (error) {
      console.warn('Notification permission failed:', error);
    }
    return false;
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('🔒 Wake lock acquired - screen will stay active');
        
        this.wakeLock.addEventListener('release', () => {
          console.log('🔓 Wake lock released - attempting to re-acquire');
          setTimeout(() => this.requestWakeLock(), 1000);
        });
        return true;
      }
    } catch (error) {
      console.warn('Wake lock not supported or failed:', error);
    }
    return false;
  }

  async unlockAudioForMobile() {
    try {
      // Create a silent audio buffer to unlock audio on mobile
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      console.log('🔓 Mobile audio unlocked');
    } catch (error) {
      console.warn('Audio unlock failed:', error);
    }
  }

  setupBackgroundHandling() {
    // Handle visibility changes for background/foreground
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackgroundMode();
      } else {
        this.handleForegroundMode();
      }
    });

    // Handle page focus/blur
    window.addEventListener('blur', () => this.handleBackgroundMode());
    window.addEventListener('focus', () => this.handleForegroundMode());
  }

  handleBackgroundMode() {
    this.isBackgroundActive = true;
    console.log('📱 App in background - maintaining audio alerts');
    
    // Keep audio context active in background
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  handleForegroundMode() {
    this.isBackgroundActive = false;
    console.log('📱 App in foreground');
    
    // Re-acquire wake lock if lost
    if (!this.wakeLock || this.wakeLock.released) {
      this.requestWakeLock();
    }

    // Process queued notifications
    this.processNotificationQueue();
  }

  // MAXIMUM VOLUME TABLE ORDER SOUND
  async playTableOrderSound() {
    if (!this.isEnabled) return;

    console.log('🔔 PLAYING TABLE ORDER SOUND AT FULL VOLUME');
    
    // Play audio sound
    this.playMaxVolumeBeeps([1200, 1400, 1200, 1400, 1200], 0.2, 150);
    
    // Show notification for locked screens
    this.showNotificationWithSound('🍽️ New Table Order!', 'A new dine-in order has been received', 'table');
  }

  // MAXIMUM VOLUME DELIVERY ORDER SOUND
  async playDeliveryOrderSound() {
    if (!this.isEnabled) return;

    console.log('🚚 PLAYING DELIVERY ORDER SOUND AT FULL VOLUME');
    
    // Play audio sound
    this.playMaxVolumeBeeps([800, 1000, 1200], 0.4, 300);
    
    // Show notification for locked screens
    this.showNotificationWithSound('🚚 New Delivery Order!', 'A new delivery order has been received', 'delivery');
  }

  playMaxVolumeBeeps(frequencies, duration, interval) {
    if (!this.audioContext) return;

    frequencies.forEach((frequency, index) => {
      setTimeout(() => {
        this.generateMaxVolumeBeep(frequency, duration);
      }, index * interval);
    });
  }

  generateMaxVolumeBeep(frequency, duration) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const compressor = this.audioContext.createDynamicsCompressor();
    const filter = this.audioContext.createBiquadFilter();

    // Audio chain for maximum volume and clarity
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(this.audioContext.destination);

    // Oscillator settings for attention-grabbing sound
    oscillator.frequency.value = frequency;
    oscillator.type = 'square'; // Sharp, attention-grabbing sound

    // Filter for clarity
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 30;

    // Compressor for maximum loudness
    compressor.threshold.setValueAtTime(-6, this.audioContext.currentTime);
    compressor.knee.setValueAtTime(40, this.audioContext.currentTime);
    compressor.ratio.setValueAtTime(20, this.audioContext.currentTime);
    compressor.attack.setValueAtTime(0, this.audioContext.currentTime);
    compressor.release.setValueAtTime(0.1, this.audioContext.currentTime);

    // MAXIMUM VOLUME with sharp envelope
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1.0, now + 0.01); // Instant attack
    gainNode.gain.setValueAtTime(1.0, now + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  showNotificationWithSound(title, body, type) {
    if (this.isBackgroundActive || document.hidden) {
      // Show browser notification for locked screens
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `food-zone-${type}`,
          requireInteraction: true, // Keep notification until user interacts
          silent: false, // Allow notification sound
          vibrate: [200, 100, 200, 100, 200], // Vibration pattern
          actions: [
            {
              action: 'view',
              title: 'View Order'
            }
          ]
        });

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        console.log('🔔 Background notification sent for locked screen');
      }
    } else {
      // Queue notification for later if in foreground
      this.notificationQueue.push({ title, body, type });
    }
  }

  processNotificationQueue() {
    // Process any queued notifications when app comes to foreground
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      console.log('📱 Processing queued notification:', notification.title);
    }
  }

  // Force maximum volume
  setMaxVolume() {
    this.volume = 1.0;
    console.log('🔊 Volume set to MAXIMUM (100%)');
  }

  // Enable/disable with persistence
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('foodZoneMobileAudioEnabled', enabled.toString());
    
    if (enabled) {
      this.setMaxVolume();
      console.log('🔊 Mobile audio alerts ENABLED at maximum volume');
    } else {
      console.log('🔇 Mobile audio alerts DISABLED');
    }
  }

  // Request all permissions at once
  async requestAllPermissions() {
    console.log('📱 Requesting all mobile PWA permissions...');
    
    const results = await Promise.allSettled([
      this.requestNotificationPermission(),
      this.requestWakeLock(),
      this.unlockAudioForMobile()
    ]);

    const granted = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`✅ ${granted}/3 mobile permissions granted`);
    
    return granted >= 2; // At least notifications and audio
  }

  // Test sound functionality
  testSound() {
    console.log('🧪 Testing mobile audio at full volume...');
    this.playTableOrderSound();
    
    setTimeout(() => {
      this.playDeliveryOrderSound();
    }, 2000);
  }
}

// Create singleton instance
const mobileAudioManager = new MobileAudioManager();

// Auto-enable at maximum volume
mobileAudioManager.setMaxVolume();

export default mobileAudioManager;
