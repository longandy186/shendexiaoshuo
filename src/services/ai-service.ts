/**
 * AI 服务层
 * 封装所有 AI 相关的接口调用
 * 符合技术文档 7.1 services/ 目录规范
 */

import { ApiResponse } from '@/lib/api-types';

export interface GenerateParams {
  type: 'outline' | 'chapter' | 'continue' | 'character' | 'plot';
  prompt: string;
  context?: {
    novelId?: string;
    chapterId?: string;
    previousContent?: string;
    characters?: any[];
    worldSettings?: any[];
    chapterCount?: number;
  };
}

export interface StreamChunk {
  content: string;
  error?: string;
}

/**
 * AI 生成服务
 * 提供流式生成和非流式生成两种方式
 */
class AIService {
  private baseUrl = '/api/v1/ai';

  /**
   * 流式生成内容
   * @param params 生成参数
   * @param onChunk 内容块回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   */
  async generateStream(
    params: GenerateParams,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || '生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法获取响应流');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data) as StreamChunk;
              if (parsed.content) {
                onChunk(parsed.content);
              } else if (parsed.error) {
                onError(new Error(parsed.error));
                return;
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  }

  /**
   * 非流式生成（用于测试或需要完整响应的场景）
   * @param params 生成参数
   * @returns 完整生成的文本
   */
  async generateOnce(params: GenerateParams): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullContent = '';

      this.generateStream(
        params,
        (chunk) => {
          fullContent += chunk;
        },
        () => {
          resolve(fullContent);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * 生成大纲
   */
  async generateOutline(prompt: string, genre?: string, context?: any): Promise<string> {
    return this.generateOnce({
      type: 'outline',
      prompt,
      context: {
        ...context,
        genre,
      },
    });
  }

  /**
   * 生成章节
   */
  async generateChapter(prompt: string, context?: any): Promise<string> {
    return this.generateOnce({
      type: 'chapter',
      prompt,
      context,
    });
  }

  /**
   * 智能续写
   */
  async continueWriting(prompt: string, context?: any): Promise<string> {
    return this.generateOnce({
      type: 'continue',
      prompt,
      context,
    });
  }

  /**
   * 生成角色
   */
  async generateCharacter(prompt: string): Promise<string> {
    return this.generateOnce({
      type: 'character',
      prompt,
    });
  }

  /**
   * 生成剧情建议
   */
  async generatePlotSuggestions(prompt: string, context?: any): Promise<string> {
    return this.generateOnce({
      type: 'plot',
      prompt,
      context,
    });
  }
}

// 导出单例
export const aiService = new AIService();
