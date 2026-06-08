import { useCallback, useRef, useEffect } from 'react';

/**
 * Infinite scroll hook using IntersectionObserver.
 * Calls `loadMore` when the sentinel element becomes visible.
 *
 * @param {Function} loadMore - Function to call when more data is needed
 * @param {boolean} hasMore - Whether there is more data to load
 * @param {boolean} isLoading - Whether data is currently loading
 * @returns {Function} sentinelRef — attach this to the "load more" trigger element
 */
export const useInfiniteScroll = (loadMore, hasMore, isLoading) => {
  const observer = useRef(null);

  const sentinelRef = useCallback(
    (node) => {
      if (isLoading) return;

      // Disconnect previous observer
      if (observer.current) observer.current.disconnect();

      if (!hasMore) return;

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );

      if (node) observer.current.observe(node);
    },
    [loadMore, hasMore, isLoading]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return sentinelRef;
};

export default useInfiniteScroll;
