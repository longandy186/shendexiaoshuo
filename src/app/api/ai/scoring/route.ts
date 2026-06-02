import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getUserMembershipBenefits, canUseAiScoring } from '@/config/membership';

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

/**
 * POST - AI打分接口
 * 使用AI模型对内容进行评分（1-10分）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const { content } = await request.json();

    if (!content) {
      return errorResponse('请提供需要评分的内容');
    }

    const client = getSupabaseClient();

    // 获取用户详细信息
    const { data: userData } = await client
      .from('users')
      .select('*')
      .eq('id', user.userId)
      .single();

    if (!userData) {
      return errorResponse('用户不存在', 404);
    }

    // 获取用户会员权益
    const benefits = getUserMembershipBenefits(userData);

    // 超级管理员检查
    const isSuperAdmin = userData.email === '13960104@qq.com' || userData.username === '342' || userData.role === 'superadmin';

    // 检查是否可以使用AI打分（超级管理员跳过）
    let scoringStatus = canUseAiScoring(userData);
    
    if (!isSuperAdmin) {
      if (!scoringStatus.canUse) {
        if (scoringStatus.limit === 0) {
          return errorResponse('当前会员等级不支持AI打分功能，请升级会员');
        } else {
          return errorResponse(
            `AI打分次数已用完，今天还剩 ${scoringStatus.remaining} 次。明天会自动重置。`
          );
        }
      }

      // 检查是否需要重置次数
      const now = new Date();
      const resetDate = userData.ai_scoring_reset_date
        ? new Date(userData.ai_scoring_reset_date)
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!resetDate || resetDate < today) {
        // 重置次数
        await client
          .from('users')
          .update({
            ai_scoring_used: 0,
            ai_scoring_reset_date: today.toISOString(),
          })
          .eq('id', user.userId);
      }
    }

    // 调用AI进行打分
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位专业的文学评论家。请对用户提供的小说内容进行评分（1-10分）。

评分标准：
- 1-3分：内容质量差，情节混乱，文笔粗糙
- 4-6分：内容尚可，情节合理，文笔一般
- 7-8分：内容优秀，情节吸引人，文笔流畅
- 9-10分：内容卓越，情节精彩，文笔优美

请只返回一个数字（1-10），不要有任何其他说明。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: content },
    ];

    const result = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3,
    });

    // 解析评分
    let score = 0;
    try {
      const scoreMatch = result.content?.toString().match(/\d+/);
      if (scoreMatch) {
        score = parseInt(scoreMatch[0]);
        // 确保分数在1-10之间
        score = Math.max(1, Math.min(10, score));
      }
    } catch (error) {
      console.error('解析评分失败:', error);
      return errorResponse('AI打分失败，请重试');
    }

    // 更新用户使用次数（超级管理员不需要）
    if (!isSuperAdmin) {
      const newUsedCount = (userData.ai_scoring_used || 0) + 1;
      await client
        .from('users')
        .update({
          ai_scoring_used: newUsedCount,
        })
        .eq('id', user.userId);

      // 计算剩余次数
      const remainingCount = scoringStatus.limit - newUsedCount;

      return successResponse({
        score,
        content,
        quota: {
          used: newUsedCount,
          remaining: remainingCount,
          limit: scoringStatus.limit,
        },
      }, 'AI打分完成');
    } else {
      // 超级管理员返回无限配额
      return successResponse({
        score,
        content,
        quota: {
          used: 99999,
          remaining: 99999,
          limit: 99999,
        },
      }, 'AI打分完成');
    }
  } catch (error: any) {
    console.error('AI打分失败:', error);
    return errorResponse('服务器错误', 500);
  }
}

/**
 * GET - 获取AI打分次数信息
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 获取用户详细信息
    const { data: userData } = await client
      .from('users')
      .select('*')
      .eq('id', user.userId)
      .single();

    if (!userData) {
      return errorResponse('用户不存在', 404);
    }

    // 获取用户会员权益
    const benefits = getUserMembershipBenefits(userData);

    // 检查是否可以使用AI打分
    const scoringStatus = canUseAiScoring(userData);

    return successResponse({
      canUse: scoringStatus.canUse,
      limit: scoringStatus.limit,
      used: userData.ai_scoring_used || 0,
      remaining: scoringStatus.remaining,
      resetDate: userData.ai_scoring_reset_date,
    });
  } catch (error: any) {
    console.error('获取AI打分信息失败:', error);
    return errorResponse('服务器错误', 500);
  }
}
