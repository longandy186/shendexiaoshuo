import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isSuperAdminUser } from '@/utils/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AI_MODELS, getAvailableModelsByPlan, getUserMembershipBenefits, getAvailableModelsForUser } from '@/config/membership';

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
 * GET - 获取所有AI模型列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return errorResponse('未登录', 401);
    }

    const client = getSupabaseClient();

    // 获取用户详细信息（包含email用于超级管理员判断）
    const { data: userData } = await client
      .from('users')
      .select('is_premium, premium_expires_at, premium_plan, email, username')
      .eq('id', user.userId)
      .single();

    if (!userData) {
      return errorResponse('用户不存在', 404);
    }

    // 获取用户会员权益
    const benefits = getUserMembershipBenefits(userData);

    // 超级管理员获取所有模型
    let availableModels = getAvailableModelsByPlan(
      (userData.premium_plan as any) || 'trial'
    );
    
    // 如果是超级管理员，返回所有模型
    if (isSuperAdminUser(user) || benefits.aiModelsLimit >= 999) {
      availableModels = AI_MODELS;
    }

    // 获取所有模型列表
    const allModels = AI_MODELS;

    return successResponse({
      user: {
        isPremium: userData.is_premium,
        premiumExpiresAt: userData.premium_expires_at,
        premiumPlan: userData.premium_plan,
      },
      benefits: {
        aiModelsLimit: benefits.aiModelsLimit,
        availableModels,
      },
      allModels: allModels.map(model => ({
        ...model,
        available: availableModels.some(m => m.id === model.id),
      })),
    });
  } catch (error: any) {
    console.error('获取AI模型列表失败:', error);
    return errorResponse('服务器错误', 500);
  }
}
