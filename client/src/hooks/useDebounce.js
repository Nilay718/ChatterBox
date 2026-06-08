import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Debounce hook — delays calling a function until a specified
 * amount of time has passed since the last invocation.
 * Commonly used for search input and typing indicators.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} The debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Debounced callback hook — returns a function that will only
 * execute after the specified delay from the last call.
 *
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function}
 */
export const useDebouncedCallback = (callback, delay = 500) => {
  const timeoutRef = useRef(null);

  const debouncedFn = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
};

export default useDebounce;
