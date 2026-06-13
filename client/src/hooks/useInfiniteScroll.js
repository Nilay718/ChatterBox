import { useCallback, useRef, useEffect } from 'react';

// Calls loadMore when the sentinel element scrolls into view
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
