type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeRewardsRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerRewardsRefresh(): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // Ignore listener errors so one bad subscriber doesn't break others
    }
  }
}

