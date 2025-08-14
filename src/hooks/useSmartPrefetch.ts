import { useEffect, useRef } from "react";
import { InfiniteQueryObserverResult } from "@tanstack/react-query";

interface UseSmartPrefetchOptions {
  fetchNextPage: () => Promise<InfiniteQueryObserverResult>;
  hasNextPage: boolean;
  isFetching: boolean;
  threshold?: number; // Percentage of remaining items to trigger prefetch (default: 0.8)
  prefetchThreshold?: number; // Number of items from bottom to start prefetching (default: 50)
}

export const useSmartPrefetch = ({
  fetchNextPage,
  hasNextPage,
  isFetching,
  threshold = 0.8,
  prefetchThreshold = 50
}: UseSmartPrefetchOptions) => {
  const prefetchTriggered = useRef(false);
  const lastScrollPosition = useRef(0);
  const scrollVelocity = useRef(0);

  const handleScroll = (
    scrollElement: HTMLElement | null,
    totalItems: number,
    visibleItems: { index: number }[]
  ) => {
    if (!scrollElement || !hasNextPage || isFetching) return;

    const currentScrollTop = scrollElement.scrollTop;
    const scrollHeight = scrollElement.scrollHeight;
    const clientHeight = scrollElement.clientHeight;
    
    // Calculate scroll velocity for predictive prefetching
    scrollVelocity.current = currentScrollTop - lastScrollPosition.current;
    lastScrollPosition.current = currentScrollTop;

    // Get the last visible item index
    const lastVisibleIndex = Math.max(...visibleItems.map(item => item.index));
    const remainingItems = totalItems - lastVisibleIndex;

    // Trigger prefetch based on scroll position OR remaining items
    const scrollProgress = (currentScrollTop + clientHeight) / scrollHeight;
    const shouldPrefetchByScroll = scrollProgress >= threshold;
    const shouldPrefetchByItems = remainingItems <= prefetchThreshold;
    
    // Predictive prefetching: if scrolling fast downward, prefetch earlier
    const isScrollingFast = scrollVelocity.current > 5;
    const shouldPrefetchPredictive = isScrollingFast && scrollProgress >= (threshold - 0.1);

    if ((shouldPrefetchByScroll || shouldPrefetchByItems || shouldPrefetchPredictive) && !prefetchTriggered.current) {
      prefetchTriggered.current = true;
      fetchNextPage();
    }
  };

  // Reset prefetch trigger when new data is loaded
  useEffect(() => {
    if (!isFetching) {
      prefetchTriggered.current = false;
    }
  }, [isFetching]);

  return { handleScroll };
};