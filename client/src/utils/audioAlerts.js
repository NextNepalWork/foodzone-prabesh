// Enhanced audio alert system for push notifications
class AudioAlertManager {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.isPlaying = false;
  }

  // Initialize audio context
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume audio context if suspended (required for mobile browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return true;
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      return false;
    }
  }

  // Create a loud kitchen alarm sound
  createKitchenAlarm(frequency = 1200, duration = 1.0) {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();

    // Connect audio nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure urgent alarm sound
    oscillator.type = 'square'; // Harsher, more attention-grabbing
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    // Create warbling effect for urgency
    oscillator.frequency.linearRampToValueAtTime(frequency * 1.5, this.audioContext.currentTime + duration * 0.5);
    oscillator.frequency.linearRampToValueAtTime(frequency, this.audioContext.currentTime + duration);

    // Add filter for cutting through noise
    filterNode.type = 'highpass';
    filterNode.frequency.setValueAtTime(800, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(5, this.audioContext.currentTime);

    // Volume envelope (very loud, sustained)
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.9, this.audioContext.currentTime + 0.02); // Very loud start
    gainNode.gain.setValueAtTime(0.9, this.audioContext.currentTime + duration * 0.8); // Sustained volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    return { oscillator, gainNode, duration };
  }

  // Play urgent kitchen alarm 5 times with intervals
  async playUrgentKitchenAlarm() {
    if (!this.isEnabled || this.isPlaying) return;
    
    this.isPlaying = true;
    
    try {
      // Ensure audio context is ready
      if (!this.audioContext) {
        await this.init();
      }
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play 5 urgent alarm sounds with varying frequencies for maximum attention
      const frequencies = [1200, 1500, 1200, 1500, 1200]; // Alternating high frequencies
      const interval = 0.6; // Faster intervals for urgency

      for (let i = 0; i < 5; i++) {
        const alarm = this.createKitchenAlarm(frequencies[i], 0.8);
        if (alarm) {
          const startTime = this.audioContext.currentTime + (i * interval);
          alarm.oscillator.start(startTime);
          alarm.oscillator.stop(startTime + alarm.duration);
        }
        
        // Add strong vibration pattern for mobile devices
        if (navigator.vibrate) {
          setTimeout(() => {
            navigator.vibrate([500, 100, 500, 100, 500]); // Very strong vibration
          }, i * interval * 1000);
        }
      }

      // Reset playing flag after all sounds complete
      setTimeout(() => {
        this.isPlaying = false;
      }, (5 * interval + 0.8) * 1000);

    } catch (error) {
      console.warn('Kitchen alarm failed:', error);
      this.isPlaying = false;
    }
  }

  // Play kitchen alarm audio file with maximum volume and urgency
  async playKitchenAlarmFile(audioUrl, times = 5) {
    if (!this.isEnabled || this.isPlaying) return;
    
    this.isPlaying = true;
    
    try {
      for (let i = 0; i < times; i++) {
        const audio = new Audio(audioUrl);
        audio.volume = 1.0; // Maximum volume
        audio.playbackRate = 1.1; // Slightly faster for urgency
        
        // Play with shorter delay for urgency
        setTimeout(async () => {
          try {
            await audio.play();
            
            // Add intense vibration pattern
            if (navigator.vibrate) {
              navigator.vibrate([600, 150, 600, 150, 600]);
            }
          } catch (error) {
            console.warn(`Kitchen alarm play attempt ${i + 1} failed:`, error);
          }
        }, i * 700); // Faster intervals (0.7 seconds)
      }
      
      // Reset playing flag
      setTimeout(() => {
        this.isPlaying = false;
      }, times * 700 + 2000);
      
    } catch (error) {
      console.warn('Kitchen alarm file playback failed:', error);
      this.isPlaying = false;
    }
  }

  // Create urgent kitchen notification sound
  async playNotificationAlert() {
    if (!this.isEnabled || this.isPlaying) return;
    
    // Try Web Audio API first (better for PWA/offline)
    try {
      await this.playUrgentKitchenAlarm();
    } catch (error) {
      console.warn('Web Audio API failed, trying kitchen alarm file:', error);
      // Fallback to kitchen alarm audio file
      await this.playKitchenAlarmFile('/sounds/kitchen-alarm.mp3', 5);
    }
  }

  // Enable/disable audio alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Check if audio is enabled
  getEnabled() {
    return this.isEnabled;
  }

  // Request audio permissions (for mobile browsers)
  async requestPermissions() {
    try {
      // Try to initialize audio context
      const initialized = await this.init();
      if (!initialized) return false;
      
      // Play a silent sound to unlock audio on mobile
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
        
        console.log('Audio context unlocked successfully');
      }
      
      return true;
    } catch (error) {
      console.warn('Audio permission request failed:', error);
      return false;
    }
  }

  // Create a simple bell sound for testing
  createBellSound(frequency = 800, duration = 0.3) {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    return { oscillator, gainNode, duration };
  }

  // Test audio functionality
  async testAudio() {
    try {
      await this.init();
      if (this.audioContext && this.audioContext.state === 'running') {
        console.log('Audio test: Playing single bell');
        const bell = this.createBellSound(800, 0.3);
        if (bell) {
          bell.oscillator.start();
          bell.oscillator.stop(this.audioContext.currentTime + bell.duration);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Audio test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const audioAlertManager = new AudioAlertManager();

export default audioAlertManager;
