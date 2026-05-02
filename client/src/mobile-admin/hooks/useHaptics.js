export default function useHaptics() {
  const tap = (ms = 8) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (_) {}
    }
  };
  const success = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([10, 40, 10]); } catch (_) {}
    }
  };
  const warn = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 60, 20, 60]); } catch (_) {}
    }
  };
  return { tap, success, warn };
}
