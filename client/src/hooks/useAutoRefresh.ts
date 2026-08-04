import { useEffect, useRef } from 'react';

/**
 * Ejecuta `callback` inmediatamente y luego cada `intervalMs`.
 * Se limpia automáticamente al desmontar el componente.
 */
export function useAutoRefresh(callback: () => void, intervalMs: number, enabled = true): void {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
