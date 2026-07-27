import { useSyncExternalStore } from 'react';

type Listener = () => void;

type SetState<T> = (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
type GetState<T> = () => T;

export function create<T extends object>(
  initializer: (set: SetState<T>, get: GetState<T>) => T,
) {
  let state: T;
  const listeners = new Set<Listener>();

  const setState: SetState<T> = (partial) => {
    const next = typeof partial === 'function' ? (partial as (s: T) => Partial<T>)(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const getState: GetState<T> = () => state;
  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };

  state = initializer(setState, getState);

  function useStore<S>(selector: (s: T) => S): S {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    );
  }
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}
