export function debounce<T>(fn: (...args: T[]) => void, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: T[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
    // fn(...args);
  };
}
