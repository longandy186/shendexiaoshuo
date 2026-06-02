import { useState, useEffect, useRef, useCallback } from 'react';

interface LazyLoadOptions {
  threshold?: number; // 触发加载的阈值（像素），默认100px
  rootMargin?: string; // 根边距，默认'0px'
  enabled?: boolean; // 是否启用懒加载，默认true
}

/**
 * 懒加载 Hook
 * 用于检测元素是否进入视口，触发加载操作
 */
export function useLazyLoad<T>(
  loadMore: () => Promise<T[]>,
  options: LazyLoadOptions = {}
) {
  const {
    threshold = 100,
    rootMargin = '0px',
    enabled = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMoreRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialLoadRef = useRef(false);

  // 加载更多数据
  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasMore || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newItems = await loadMore();
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载失败'));
      console.error('[useLazyLoad] 加载失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, isLoading, hasMore, enabled]);

  // 初始加载
  useEffect(() => {
    if (!initialLoadRef.current && enabled) {
      loadMoreItems();
      initialLoadRef.current = true;
    }
  }, [loadMoreItems, enabled]);

  // 设置 Intersection Observer
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target || !hasMore) {
      return;
    }

    // 清除旧的 observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 创建新的 observer
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMoreItems();
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      }
    );

    observer.observe(target);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [loadMoreRef, hasMore, loadMoreItems, rootMargin, enabled]);

  // 重置
  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setIsLoading(false);
    setError(null);
    initialLoadRef.current = false;
  }, []);

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMoreRef,
    reset,
    loadMore: loadMoreItems,
  };
}

/**
 * 虚拟滚动 Hook
 * 用于渲染大量数据时的性能优化
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  options: {
    overscan?: number; // 预渲染的额外行数
  } = {}
) {
  const { overscan = 5 } = options;

  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleItems,
    visibleStart,
    visibleEnd,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

/**
 * 图片懒加载 Hook
 */
export function useImageLazyLoad() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const imageRef = useRef<HTMLImageElement | null>(null);

  const loadImage = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const markAsLoaded = useCallback((src: string) => {
    setLoadedImages((prev) => new Set(prev).add(src));
  }, []);

  const isLoaded = useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  return {
    loadedImages,
    loadImage,
    markAsLoaded,
    isLoaded,
    imageRef,
  };
}

/**
 * 数据预加载 Hook
 */
export function usePreload<T>(loadFn: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const preload = useCallback(async () => {
    if (!enabled || isLoading || data) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('预加载失败'));
    } finally {
      setIsLoading(false);
    }
  }, [loadFn, enabled, isLoading, data]);

  useEffect(() => {
    preload();
  }, [preload]);

  return {
    data,
    isLoading,
    error,
    preload,
  };
}
