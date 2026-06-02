import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取单个语言风格
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('language_styles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LanguageStyle API] Error fetching language style:', error);
      return NextResponse.json(
        { code: 404, msg: '语言风格不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // 增加使用次数
    await supabase
      .from('language_styles')
      .update({ usage: (data.usage || 0) + 1 })
      .eq('id', id);

    return NextResponse.json({
      code: 200,
      msg: '获取成功',
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[LanguageStyle API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 更新语言风格
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, keywords, tags, prompt, userId } = body;

    // 先检查是否存在
    const supabase = getSupabaseClient();
    const { data: existing, error: checkError } = await supabase
      .from('language_styles')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { code: 404, msg: '语言风格不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // 检查权限：系统提示词不能修改（除非是超级管理员）
    if (existing.is_system) {
      return NextResponse.json(
        { code: 403, msg: '系统提示词不能修改', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 检查权限：用户只能修改自己的提示词
    if (existing.user_id && existing.user_id !== userId) {
      return NextResponse.json(
        { code: 403, msg: '没有权限修改此提示词', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 更新
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (keywords !== undefined) updateData.keywords = keywords;
    if (tags !== undefined) updateData.tags = tags;
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('language_styles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[LanguageStyle API] Error updating language style:', error);
      return NextResponse.json(
        { code: 500, msg: '更新语言风格失败', timestamp: Date.now() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: '更新成功',
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[LanguageStyle API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 删除语言风格
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 先检查是否存在
    const supabase = getSupabaseClient();
    const { data: existing, error: checkError } = await supabase
      .from('language_styles')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { code: 404, msg: '语言风格不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // 检查权限：系统提示词不能删除
    if (existing.is_system) {
      return NextResponse.json(
        { code: 403, msg: '系统提示词不能删除', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 检查权限：用户只能删除自己的提示词
    if (userId && existing.user_id && existing.user_id !== userId) {
      return NextResponse.json(
        { code: 403, msg: '没有权限删除此提示词', timestamp: Date.now() },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('language_styles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[LanguageStyle API] Error deleting language style:', error);
      return NextResponse.json(
        { code: 500, msg: '删除语言风格失败', timestamp: Date.now() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: '删除成功',
      data: null,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[LanguageStyle API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
