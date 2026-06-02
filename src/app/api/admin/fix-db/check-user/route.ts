import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 部署环境数据库检查API
 * 用于检查部署环境数据库中用户的信息
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

    // 创建 Supabase 客户端（使用部署环境的环境变量）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 查询用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('查询用户失败:', error)
      return NextResponse.json({
        code: 500,
        msg: '查询用户失败',
        data: { error: error.message },
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

    // 返回用户信息
    return NextResponse.json({
      code: 200,
      msg: '查询成功',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        membership_level: user.membership_level,
        created_at: user.created_at,
        last_login_at: user.last_login_at
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
