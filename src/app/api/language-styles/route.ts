import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取所有语言风格
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = getSupabaseClient();

    // 获取所有系统提示词 + 用户自定义提示词
    let query = supabase.from('language_styles').select('*').order('is_system', { ascending: false }).order('usage', { ascending: false });

    if (userId) {
      query = query.or('is_system.eq.true,user_id.eq.' + userId);
    } else {
      // 如果没有提供 userId，只返回系统提示词
      query = query.eq('is_system', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[LanguageStyles API] Error fetching language styles:', error);
      return NextResponse.json(
        { code: 500, msg: '获取语言风格失败', timestamp: Date.now() },
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
    console.error('[LanguageStyles API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 创建新的语言风格
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, keywords, tags, prompt, userId } = body;

    // 验证必填字段
    if (!name || !prompt) {
      return NextResponse.json(
        { code: 400, msg: '名称和提示词内容为必填项', timestamp: Date.now() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase.from('language_styles').insert({
      id,
      name: name.trim(),
      description: description?.trim() || '',
      keywords: keywords || [],
      tags: tags || [],
      prompt: prompt.trim(),
      is_system: false,
      user_id: userId,
      usage: 0
    }).select().single();

    if (error) {
      console.error('[LanguageStyles API] Error creating language style:', error);
      return NextResponse.json(
        { code: 500, msg: '创建语言风格失败', timestamp: Date.now() },
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
    console.error('[LanguageStyles API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
