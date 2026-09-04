type Listener = (active: boolean) => void;

const listeners = new Set<Listener>();
let active = false;

function notify() {
  listeners.forEach((listener) => listener(active));
}

export function start() {
  active = true;
  notify();
}

export function done() {
  active = false;
  notify();
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
