'use client';

import { useState, useEffect } from 'react';

export default function Loading() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-950">
      <div className="text-center">
        {/* 紫色风格化图标 */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* 中心星星 */}
              <svg
                className="w-12 h-12 text-purple-600 dark:text-purple-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {/* 四角装饰 */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-200" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-300" />
            </div>
          </div>
          {/* 外圈装饰 */}
          <div className="absolute inset-0 border-2 border-purple-200 dark:border-purple-800 rounded-full animate-spin-slow" />
          <div className="absolute -inset-2 border border-purple-100 dark:border-purple-900 rounded-full animate-spin-reverse" />
        </div>

        {/* 加载状态文字 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-1">
              正在
            </div>
            <div className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              加载
            </div>
          </div>
          {/* 动态加载指示器 */}
          <div className="flex items-center gap-1 mt-4">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
            <span className="text-2xl text-gray-400">
              {'.'.repeat(dotCount)}
            </span>
          </div>
        </div>

        {/* 产品名称 */}
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <span>神的小说工坊</span>
          <span className="w-1 h-1 bg-gray-400 rounded-full" />
          <span>AI 创作工作台</span>
        </div>

        {/* 底部装饰线条 */}
        <div className="mt-8 w-32 h-0.5 mx-auto bg-gradient-to-r from-transparent via-purple-300 to-transparent dark:via-purple-700" />
      </div>
    </div>
  );
}
