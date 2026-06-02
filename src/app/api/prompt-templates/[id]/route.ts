import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取单个提示词模板
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[PromptTemplate API] Error fetching prompt template:', error);
      return NextResponse.json(
        { code: 404, msg: '提示词模板不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      msg: '获取成功',
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[PromptTemplate API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 更新提示词模板
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, systemPrompt, userPrompt, userId } = body;

    // 先检查是否存在
    const supabase = getSupabaseClient();
    const { data: existing, error: checkError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { code: 404, msg: '提示词模板不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // 检查权限：系统模板不能修改（除非重置）
    if (!existing.is_custom) {
      return NextResponse.json(
        { code: 403, msg: '系统模板不能修改', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 检查权限：用户只能修改自己的模板
    if (userId && existing.user_id && existing.user_id !== userId) {
      return NextResponse.json(
        { code: 403, msg: '没有权限修改此模板', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 验证 category 是否合法（如果提供）
    if (category) {
      const validCategories = ['document-parse', 'character', 'world', 'writing', 'general', 'polish', 'outline', 'chapter', 'plot', 'cool-opener', 'expand', 'remove-ai-trace'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { code: 400, msg: '无效的类别', timestamp: Date.now() },
          { status: 400 }
        );
      }
    }

    // 更新
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category;
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt.trim();
    if (userPrompt !== undefined) updateData.user_prompt = userPrompt.trim();
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PromptTemplate API] Error updating prompt template:', error);
      return NextResponse.json(
        { code: 500, msg: '更新提示词模板失败', timestamp: Date.now() },
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
    console.error('[PromptTemplate API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 重置提示词模板为系统默认
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      // 获取系统默认模板
      const supabase = getSupabaseClient();

      // 查找对应的系统模板
      const { data: systemTemplate } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('is_custom', false)
        .ilike('name', id.replace(/^custom-/, ''))
        .single();

      if (!systemTemplate) {
        return NextResponse.json(
          { code: 404, msg: '未找到对应的系统模板', timestamp: Date.now() },
          { status: 404 }
        );
      }

      // 用系统模板更新用户自定义模板
      const { data, error } = await supabase
        .from('prompt_templates')
        .update({
          system_prompt: systemTemplate.system_prompt,
          user_prompt: systemTemplate.user_prompt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[PromptTemplate API] Error resetting prompt template:', error);
        return NextResponse.json(
          { code: 500, msg: '重置提示词模板失败', timestamp: Date.now() },
          { status: 500 }
        );
      }

      return NextResponse.json({
        code: 200,
        msg: '重置成功',
        data,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(
      { code: 400, msg: '无效的操作', timestamp: Date.now() },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[PromptTemplate API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}

/**
 * 删除提示词模板
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
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { code: 404, msg: '提示词模板不存在', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // 检查权限：系统模板不能删除
    if (!existing.is_custom) {
      return NextResponse.json(
        { code: 403, msg: '系统模板不能删除', timestamp: Date.now() },
        { status: 403 }
      );
    }

    // 检查权限：用户只能删除自己的模板
    if (userId && existing.user_id && existing.user_id !== userId) {
      return NextResponse.json(
        { code: 403, msg: '没有权限删除此模板', timestamp: Date.now() },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[PromptTemplate API] Error deleting prompt template:', error);
      return NextResponse.json(
        { code: 500, msg: '删除提示词模板失败', timestamp: Date.now() },
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
    console.error('[PromptTemplate API] Error:', error);
    return NextResponse.json(
      { code: 500, msg: '服务器错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
