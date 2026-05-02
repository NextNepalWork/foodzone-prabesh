// Audio notification system for Food Zone Admin
import settingsService from '../services/settingsService';

class AudioNotificationManager {
  constructor() {
    this.tableOrderSound = null;
    this.deliveryOrderSound = null;
    this.isEnabled = true;
    this.volume = 1.0; // Maximum volume
    this.wakeLock = null;
    this.isBackgroundActive = false;
    
    this.initializeSounds();
    this.loadDynamicSettings();
    
    // Subscribe to settings changes
    settingsService.subscribe(() => {
      this.loadDynamicSettings();
    });
  }

  // Load settings from the dynamic settings service
  loadDynamicSettings() {
    const notificationSettings = settingsService.getNotificationSettings();
    
    this.isEnabled = notificationSettings.soundEnabled;
    this.volume = Math.max(0.1, Math.min(1.0, notificationSettings.soundVolume / 100));
    
    console.log('🔊 Audio settings updated:', {
      enabled: this.isEnabled,
      volume: this.volume,
      volumePercent: notificationSettings.soundVolume
    });
    
    // Update existing audio elements
    if (this.tableOrderSound) this.tableOrderSound.volume = this.volume;
    if (this.deliveryOrderSound) this.deliveryOrderSound.volume = this.volume;
  }

  initializeSounds() {
    try {
      // Table order notification sound (higher pitch, shorter)
      this.tableOrderSound = new Audio('/sounds/table-order.mp3');
      this.tableOrderSound.volume = this.volume;
      this.tableOrderSound.preload = 'auto';

      // Delivery order notification sound (lower pitch, longer)
      this.deliveryOrderSound = new Audio('/sounds/delivery-order.mp3');
      this.deliveryOrderSound.volume = this.volume;
      this.deliveryOrderSound.preload = 'auto';

      // Fallback to generated sounds if files don't exist
      this.createFallbackSounds();
    } catch (error) {
      console.warn('Audio initialization failed, using fallback sounds:', error);
      this.createFallbackSounds();
    }
  }

  createFallbackSounds() {
    // Create Web Audio API context for generated sounds
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Generate table order sound (3 quick beeps, higher pitch)
  playTableOrderSound() {
    if (!this.isEnabled) return;

    console.log('🔔 Playing table order sound...');
    try {
      if (this.tableOrderSound && this.tableOrderSound.readyState >= 2) {
        this.tableOrderSound.currentTime = 0;
        this.tableOrderSound.play().catch((error) => {
          console.warn('Table order sound failed, using fallback:', error);
          this.playFallbackTableSound();
        });
      } else {
        console.log('Table order sound not ready, using fallback');
        this.playFallbackTableSound();
      }
    } catch (error) {
      console.warn('Table order sound error:', error);
      this.playFallbackTableSound();
    }
  }

  // Generate delivery order sound (2 longer beeps, lower pitch)
  playDeliveryOrderSound() {
    if (!this.isEnabled) return;

    console.log('🚚 Playing delivery order sound...');
    try {
      if (this.deliveryOrderSound && this.deliveryOrderSound.readyState >= 2) {
        this.deliveryOrderSound.currentTime = 0;
        this.deliveryOrderSound.play().catch((error) => {
          console.warn('Delivery order sound failed, using fallback:', error);
          this.playFallbackDeliverySound();
        });
      } else {
        console.log('Delivery order sound not ready, using fallback');
        this.playFallbackDeliverySound();
      }
    } catch (error) {
      console.warn('Delivery order sound error:', error);
      this.playFallbackDeliverySound();
    }
  }

  playFallbackTableSound() {
    if (!this.audioContext) return;

    // Table Order: 4 rapid high-pitched beeps (URGENT sound)
    const frequencies = [1000, 1200, 1000, 1200]; // Alternating high frequencies
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.generateBeep(frequencies[i], 0.15, 1.0); // Short, loud beeps
      }, i * 200); // Rapid succession
    }
  }

  playFallbackDeliverySound() {
    if (!this.audioContext) return;

    // Delivery Order: 3 distinct low-to-high rising tones (MELODIC sound)
    const frequencies = [300, 500, 800]; // Rising melody
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.generateBeep(frequencies[i], 0.4, 1.0); // Longer, melodic tones
      }, i * 500); // Spaced out
    }
  }

  generateBeep(frequency, duration, volume) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const compressor = this.audioContext.createDynamicsCompressor();

    // Chain: oscillator -> gain -> compressor -> destination (for louder, clearer sound)
    oscillator.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'square'; // Square wave for more distinct, attention-grabbing sound

    // Compressor settings for maximum loudness
    compressor.threshold.setValueAtTime(-10, this.audioContext.currentTime);
    compressor.knee.setValueAtTime(40, this.audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    compressor.attack.setValueAtTime(0, this.audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

    // Maximum volume with sharp attack and release for distinctness
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.005); // Very fast attack
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Enable/disable notifications - now syncs with settings service
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    // Update the settings service
    settingsService.updateSetting('notify.sound_enabled', enabled);
    
    console.log(`🔊 Audio notifications ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Set volume (0.0 to 1.0) - now syncs with settings service
  setVolume(volume) {
    const volumePercent = Math.max(10, Math.min(100, volume * 100)); // 10% to 100%
    this.volume = volumePercent / 100;
    
    // Update the settings service
    settingsService.updateSetting('notify.sound_volume', volumePercent);
    
    if (this.tableOrderSound) this.tableOrderSound.volume = this.volume;
    if (this.deliveryOrderSound) this.deliveryOrderSound.volume = this.volume;
    
    console.log(`🔊 Volume set to ${volumePercent}%`);
  }

  // Load settings from localStorage (legacy support)
  loadSettings() {
    // This method is kept for backward compatibility but now loads from settings service
    this.loadDynamicSettings();
  }

  // Request audio permissions (for mobile devices)
  async requestPermissions() {
    try {
      // Create audio context if it doesn't exist
      if (!this.audioContext && (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined')) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Test play a silent sound to unlock audio on mobile
      if (this.tableOrderSound) {
        this.tableOrderSound.volume = 0;
        const playPromise = this.tableOrderSound.play();
        if (playPromise) {
          await playPromise;
          this.tableOrderSound.pause();
          this.tableOrderSound.currentTime = 0;
          this.tableOrderSound.volume = this.volume;
        }
      }
      
      console.log('🔊 Audio permissions granted and initialized');
      return true;
    } catch (error) {
      console.warn('Audio permission request failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const audioManager = new AudioNotificationManager();

// Load saved settings
audioManager.loadSettings();

export default audioManager;
