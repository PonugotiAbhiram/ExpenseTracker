// src/utils/toast.js
// Lightweight pub-sub toast manager — no external dependencies needed.

const subscribers = new Set();
let counter = 0;

const emit = (type, message, duration = 3500) => {
  const id = `toast-${++counter}`;
  subscribers.forEach((fn) => fn({ id, type, message, duration }));
};

export const toast = {
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
  success: (msg, dur) => emit("success", msg, dur),
  error:   (msg, dur) => emit("error",   msg, dur),
  info:    (msg, dur) => emit("info",    msg, dur),
};
