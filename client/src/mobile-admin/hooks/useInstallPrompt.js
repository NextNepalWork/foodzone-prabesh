import { useEffect, useState } from 'react';

export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('m-admin-install-dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const prompt = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') dismiss();
    return outcome === 'accepted';
  };

  const dismiss = () => {
    try { localStorage.setItem('m-admin-install-dismissed', '1'); } catch (_) {}
    setDismissed(true);
  };

  return { canInstall: !!deferred && !dismissed, prompt, dismiss };
}
