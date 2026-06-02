import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/storage/database/supabase-client'

/**
 * 查询所有用户并修复管理员权限
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient()

    // 1. 查询所有用户
    const { data: users, error } = await client
      .from('users')
      .select('id, email, username, role, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        code: 500,
        msg: '查询用户失败',
        data: { error: error.message },
        timestamp: Date.now()
      })
    }

    // 2. 查找 13960104@qq.com 用户
    const targetUser = users.find(u => u.email === '13960104@qq.com')

    if (!targetUser) {
      return NextResponse.json({
        code: 404,
        msg: '用户 13960104@qq.com 不存在',
        data: { users },
        timestamp: Date.now()
      })
    }

    // 3. 如果角色不是 admin，尝试更新
    if (targetUser.role !== 'admin') {
      // 使用 RPC 或其他方式更新（如果 ANON_KEY 有权限）
      const { data: updated, error: updateError } = await client
        .from('users')
        .update({ role: 'admin' })
        .eq('email', '13960104@qq.com')
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({
          code: 500,
          msg: '更新失败（可能需要更高权限）',
          data: {
            user: targetUser,
            error: updateError.message,
            hint: '请使用 SERVICE_ROLE_KEY 或通过 Supabase 控制台手动修复'
          },
          timestamp: Date.now()
        })
      }

      return NextResponse.json({
        code: 200,
        msg: '成功更新管理员权限',
        data: {
          before: targetUser,
          after: updated
        },
        timestamp: Date.now()
      })
    }

    return NextResponse.json({
      code: 200,
      msg: '用户已经是管理员',
      data: { user: targetUser },
      timestamp: Date.now()
    })
  } catch (error: any) {
    return NextResponse.json({
      code: 500,
      msg: '服务器错误',
      data: { error: error.message },
      timestamp: Date.now()
    })
  }
}
