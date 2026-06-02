import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { requireAuth, isSuperAdminUser } from '@/utils/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AI_MODELS, getAvailableModelsByPlan, getUserMembershipBenefits } from '@/config/membership';

/**
 * 统一响应格式
 */
function successResponse(data: any, message: string = '操作成功') {
  return NextResponse.json({
    code: 200,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  });
}

function errorResponse(message: string, code: number = 400, data: any = null) {
  return NextResponse.json({
    code,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code });
}

export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const { type, prompt, context, model } = await request.json();

    // 验证参数
    if (!type || !prompt) {
      return errorResponse('缺少必要参数');
    }

    // 检查AI模型权限
    if (model) {
      const client = getSupabaseClient();

      // 获取用户会员信息（包含email用于超级管理员判断）
      const { data: userData } = await client
        .from('users')
        .select('is_premium, premium_expires_at, premium_plan, email, username')
        .eq('id', user.userId)
        .single();

      if (!userData) {
        return errorResponse('用户不存在', 404);
      }

      // 超级管理员可以使用所有模型，跳过权限检查
      if (!isSuperAdminUser(user)) {
        // 获取用户可用的模型列表
        const availableModels = getAvailableModelsByPlan(
          (userData.premium_plan as any) || 'trial'
        );

        // 检查请求的模型是否在可用列表中
        const isAvailable = availableModels.some(m => m.id === model);

        if (!isAvailable) {
          return errorResponse(
            `当前会员等级不支持此模型。可用模型: ${availableModels.map(m => m.name).join(', ')}`
          );
        }
      }
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // Build system prompt based on request type
    let systemPrompt = '';
    
    switch (type) {
      case 'outline':
        systemPrompt = `你是一位专业的小说大纲设计师。请根据用户提供的小说信息，创作详细的章节大纲。
要求：
1. 大纲应该包含15-30个章节
2. 每个章节要有明确的故事情节和发展
3. 确保情节连贯，节奏合理
4. 包含主要冲突和转折点
5. 适合${context?.genre || '小说'}类型`;
        break;
      
      case 'chapter':
        systemPrompt = `你是一位专业的小说作家。请根据提供的大纲和上下文，创作精彩的章节内容。
要求：
1. 语言生动，情节引人入胜
2. 注意人物性格和对话的合理性
3. 符合整体故事风格
4. 章节长度在2000-4000字之间
5. 注意段落结构和节奏控制`;
        break;
      
      case 'continue':
        systemPrompt = `你是一位专业的小说作家。请根据已有的章节内容，智能续写接下来的故事。
要求：
1. 保持与前面内容的一致性
2. 继续推动情节发展
3. 保持人物性格稳定
4. 语言风格统一
5. 续写内容在1000-3000字之间`;
        break;
      
      case 'character':
        systemPrompt = `你是一位专业的人物设计师。请根据用户的描述，创建详细的角色档案。
要求：
1. 包括姓名、年龄、外貌特征
2. 详细的人物性格和心理特征
3. 背景故事和动机
4. 在故事中的定位和作用
5. 与其他角色的关系`;
        break;
      
      case 'plot':
        systemPrompt = `你是一位专业的剧情设计师。请为用户提供创意的剧情发展建议。
要求：
1. 提供3-5个不同方向的剧情发展选项
2. 每个选项都要有创意和可行性
3. 考虑故事的连贯性和逻辑性
4. 包含潜在冲突和转折
5. 确保符合故事的类型和风格`;
        break;
      
      default:
        systemPrompt = '你是一位专业的小说创作助手，请帮助用户创作小说内容。';
    }

    // Build messages with context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    // Add context if available
    if (context?.previousContent) {
      messages[1].content = `\n前文内容：\n${context.previousContent}\n\n你的任务：\n${prompt}`;
    }

    if (context?.characters && context.characters.length > 0) {
      const characterInfo = context.characters
        .map((c: any) => `- ${c.name}: ${c.personality || c.role}`)
        .join('\n');
      messages[1].content += `\n\n主要角色信息：\n${characterInfo}`;
    }

    if (context?.worldSettings && context.worldSettings.length > 0) {
      const settingInfo = context.worldSettings
        .map((s: any) => `- ${s.title}: ${s.content}`)
        .join('\n');
      messages[1].content += `\n\n世界观设定：\n${settingInfo}`;
    }

    // Create streaming response
    const stream = llmClient.stream(messages, {
      model: model || 'doubao-seed-1-8-251228', // 使用指定模型或默认模型
      temperature: 0.8,
    });

    // Set up SSE response
    const encoder = new TextEncoder();
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              const data = `data: ${JSON.stringify({ content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
