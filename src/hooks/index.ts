/**
 * 自定义 Hooks
 * 封装可复用的状态逻辑和业务逻辑
 * 符合技术文档 7.1 hooks/ 目录规范
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { aiService } from '@/services/ai-service';
import type { GenerateParams } from '@/services/ai-service';

/**
 * AI 流式生成 Hook
 * 用于处理 AI 内容的流式生成
 * 
 * @example
 * const { content, isGenerating, error, generate } = useAIStream();
 * 
 * generate({
 *   type: 'chapter',
 *   prompt: '生成第一章内容',
 * });
 */
export function useAIStream() {
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (params: GenerateParams) => {
    // 清除之前的状态
    setContent('');
    setError(null);
    setIsGenerating(true);

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      await aiService.generateStream(
        params,
        // onChunk
        (chunk) => {
          setContent((prev) => prev + chunk);
        },
        // onComplete
        () => {
          setIsGenerating(false);
        },
        // onError
        (err) => {
          setError(err);
          setIsGenerating(false);
        }
      );
    } catch (err) {
      setError(err as Error);
      setIsGenerating(false);
    }
  }, []);

  // 取消生成
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    content,
    isGenerating,
    error,
    generate,
    cancel,
    reset: useCallback(() => {
      setContent('');
      setError(null);
    }, []),
  };
}

/**
 * 防抖 Hook
 * 用于延迟执行函数，避免频繁调用
 * 
 * @example
 * const debouncedSearch = useDebounce(search, 500);
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * 自动保存 Hook
 * 用于自动保存用户编辑的内容
 * 
 * @example
 * const { save, lastSaved, isSaving } = useAutoSave(saveCallback, 5000);
 */
export function useAutoSave<T>(
  saveCallback: (data: T) => Promise<void> | void,
  delay: number = 5000
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(
    async (data: T) => {
      setIsSaving(true);
      try {
        await saveCallback(data);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto save failed:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [saveCallback]
  );

  const scheduleSave = useCallback(
    (data: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        save(data);
      }, delay);
    },
    [save, delay]
  );

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    scheduleSave,
    cancelSave,
    lastSaved,
    isSaving,
  };
}

/**
 * 本地存储 Hook
 * 用于在 localStorage 中存储和读取数据
 * 
 * @example
 * const { value, setValue, remove } = useLocalStorage('user-data', defaultValue);
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const remove = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, remove];
}
