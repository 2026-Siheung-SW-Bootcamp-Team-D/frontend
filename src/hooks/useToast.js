let toastListeners = [];
export function useToast() {
  return (message) => toastListeners.forEach(cb => cb(message));
}
export function addToastListener(cb) {
  toastListeners.push(cb);
  return () => { toastListeners = toastListeners.filter(l => l !== cb); };
}
