// PWA Installation Manager for Food Zone Admin
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.installButton = null;
    
    this.init();
  }

  init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App was installed');
      this.isInstalled = true;
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('PWA: App is running in standalone mode');
    }

    // Register service worker
    this.registerServiceWorker();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('PWA: Service Worker registered successfully:', registration);
        
        // Update service worker when new version is available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('PWA: New service worker available');
              // Optionally show update notification
            }
          });
        });
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
      }
    }
  }

  showInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.addEventListener('click', () => this.promptInstall());
      this.installButton = installBtn;
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.classList.add('hidden');
    }
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('PWA: No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`PWA: User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
    } catch (error) {
      console.error('PWA: Error during install prompt:', error);
    }
  }

  // Check if PWA can be installed
  canInstall() {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  // Check if PWA is currently installed
  isAppInstalled() {
    return this.isInstalled;
  }
}

// Create singleton instance
const pwaInstaller = new PWAInstaller();

export default pwaInstaller;
