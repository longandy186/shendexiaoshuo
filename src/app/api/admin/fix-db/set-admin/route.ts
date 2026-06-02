import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 部署环境数据库修复API
 * 用于将用户设置为管理员
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({
        code: 400,
        msg: '邮箱不能为空',
        data: null,
        timestamp: Date.now()
      })
    }

    // 创建 Supabase 客户端（使用服务端密钥，有最高权限）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 先查询用户是否存在
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single()

    if (findError) {
      console.error('查询用户失败:', findError)
      return NextResponse.json({
        code: 500,
        msg: '查询用户失败',
        data: { error: findError.message },
        timestamp: Date.now()
      })
    }

    if (!user) {
      return NextResponse.json({
        code: 404,
        msg: `用户 ${email} 在部署环境数据库中不存在`,
        data: null,
        timestamp: Date.now()
      })
    }

    // 2. 更新用户角色为管理员
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', email)
      .select()
      .single()

    if (updateError) {
      console.error('更新用户角色失败:', updateError)
      return NextResponse.json({
        code: 500,
        msg: '更新用户角色失败',
        data: { error: updateError.message },
        timestamp: Date.now()
      })
    }

    // 3. 记录操作日志
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert({
        user_id: user.id,
        action: 'set_admin',
        description: `通过修复工具将用户 ${email} 设置为管理员`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('记录日志失败:', logError)
      // 日志记录失败不影响主流程
    }

    return NextResponse.json({
      code: 200,
      msg: `成功将 ${email} 设置为管理员`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        updated_at: updatedUser.updated_at
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API错误:', error)
    return NextResponse.json({
      code: 500,
      msg: '服务器错误',
      data: { error: error.message },
      timestamp: Date.now()
    })
  }
}
