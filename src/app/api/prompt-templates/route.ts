import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取所有提示词模板
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    const supabase = getSupabaseClient();

    let query = supabase.from('prompt_templates').select('*').order('is_custom', { ascending: true }).order('created_at', { ascending: false });

    // 筛选用户
    if (userId) {
      query = query.or('is_custom.eq.false,user_id.eq.' + userId);
    } else {
      // 如果没有提供 userId，只返回系统模板
      query = query.eq('is_custom', false);
    }

    // 筛选类别
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PromptTemplates API] Error fetching prompt templates:', error);
      return NextResponse.json(
        { code: 500, msg: '获取提示词模板失败', timestamp: Date.now() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: '获取成功',
      data: data || [],
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[PromptTemplates API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 创建新的提示词模板
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, systemPrompt, userPrompt, userId } = body;

    // 验证必填字段
    if (!name || !category || !systemPrompt || !userPrompt) {
      return NextResponse.json(
        { code: 400, msg: '名称、类别、系统提示词和用户提示词为必填项', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // 验证 category 是否合法
    const validCategories = ['document-parse', 'character', 'world', 'writing', 'general', 'polish', 'outline', 'chapter', 'plot', 'cool-opener', 'expand', 'remove-ai-trace'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { code: 400, msg: '无效的类别', timestamp: Date.now() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const id = `custom-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase.from('prompt_templates').insert({
      id,
      name: name.trim(),
      description: description?.trim() || '',
      category,
      system_prompt: systemPrompt.trim(),
      user_prompt: userPrompt.trim(),
      is_custom: true,
      user_id: userId
    }).select().single();

    if (error) {
      console.error('[PromptTemplates API] Error creating prompt template:', error);
      return NextResponse.json(
        { code: 500, msg: '创建提示词模板失败', timestamp: Date.now() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: '创建成功',
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[PromptTemplates API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
