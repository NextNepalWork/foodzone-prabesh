import React, { useEffect, useState } from 'react';
import soundManager from '../utils/soundManager';

// Small dismissible banner shown on staff surfaces until audio is unlocked.
// Browsers block sound before the first user gesture — tapping the banner
// unlocks playback and plays a test chime.
const SoundEnableBanner = () => {
  const [unlocked, setUnlocked] = useState(soundManager.isUnlocked());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => soundManager.onUnlockChange(setUnlocked), []);

  if (unlocked || dismissed) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between gap-3">
      <span className="font-medium">🔔 Tap to enable order alert sounds on this device</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => soundManager.enable()}
          className="px-3 py-1 bg-white text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-50"
        >
          Enable sound
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white text-lg leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default SoundEnableBanner;
