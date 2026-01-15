import { useEffect } from 'react';
import useSWRSubscription from 'swr/subscription';

const keyCallbacks = new Map<string, Set<() => void>>();

export function useShortcut(key: string, callback: () => void, single = false) {
  const shortcut = key + (single ? '-single' : '');

  useEffect(() => {
    if (!keyCallbacks.has(shortcut))
      keyCallbacks.set(shortcut, new Set());

    keyCallbacks.get(shortcut)?.add(callback);

    return () => {
      const set = keyCallbacks.get(shortcut);
      if (set) {
        set.delete(callback);
        if (set.size === 0)
          keyCallbacks.delete(shortcut);
      }
    };
  }, [callback, shortcut]);

  useSWRSubscription('global-keydown', () => {
    // eslint-disable-next-line sukka/unicorn/consistent-function-scoping -- ig
    const handler = (e: KeyboardEvent) => {
      if (keyCallbacks.has(e.key) && (e.metaKey || e.ctrlKey || single)) {
        e.preventDefault();
        keyCallbacks.get(e.key)?.forEach(cb => cb());
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
}
