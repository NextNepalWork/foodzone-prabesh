import React, { useEffect, useState } from 'react';
import soundManager from '../utils/soundManager';

// Mandatory banner shown on staff surfaces until audio is unlocked.
// Browsers block sound before the first user gesture — tapping the banner
// unlocks playback and plays a test chime. There is deliberately no dismiss
// button: a station that can't ring for new orders is not ready to work,
// so the banner stays until sound is enabled.
const SoundEnableBanner = () => {
  const [unlocked, setUnlocked] = useState(soundManager.isUnlocked());

  useEffect(() => soundManager.onUnlockChange(setUnlocked), []);

  if (unlocked) return null;

  return (
    <button
      onClick={() => soundManager.enable()}
      className="w-full bg-amber-500 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-600 transition-colors"
    >
      <span className="font-medium">🔔 Order alert sounds are off — tap to enable them on this device</span>
      <span className="shrink-0 px-3 py-1 bg-white text-amber-700 rounded-lg text-xs font-bold">
        Enable sound
      </span>
    </button>
  );
};

export default SoundEnableBanner;
