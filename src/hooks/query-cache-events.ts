type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();

export function subscribe(key: string, listener: Listener) {
  if (!listenersByKey.has(key)) listenersByKey.set(key, new Set());
  listenersByKey.get(key)?.add(listener);
  return () => {
    listenersByKey.get(key)?.delete(listener);
  };
}

export function invalidate(keys: string[]) {
  keys.forEach((key) => listenersByKey.get(key)?.forEach((listener) => listener()));
}
