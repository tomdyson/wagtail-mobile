// Simple event emitter for auth failures.
// The API layer calls onAuthFailure() on 401; the root layout listens and disconnects.

type Listener = () => void;

let listener: Listener | null = null;

export function setAuthFailureListener(fn: Listener | null) {
  listener = fn;
}

export function emitAuthFailure() {
  listener?.();
}
