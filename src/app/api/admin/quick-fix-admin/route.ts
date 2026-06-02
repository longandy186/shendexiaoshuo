import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 快速修复管理员权限API
 * 直接在数据库中设置用户为管理员
 */
export async function POST(request: NextRequest) {
  try {
    // 创建 Supabase 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        code: 500,
        msg: '数据库配置缺失',
        error: 'NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 查询当前用户信息
    const { data: currentUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', '13960104@qq.com')
      .single()

    if (findError) {
      console.error('查询用户失败:', findError)
      return NextResponse.json({
        code: 500,
        msg: '查询用户失败',
        error: findError.message
      })
    }

    if (!currentUser) {
      return NextResponse.json({
        code: 404,
        msg: '用户不存在',
        email: '13960104@qq.com'
      })
    }

    console.log('当前用户信息:', {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      membership_level: currentUser.membership_level
    })

    // 2. 更新用户权限
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role: 'admin',
        membership_level: '超级管理员'
      })
      .eq('email', '13960104@qq.com')
      .select()
      .single()

    if (updateError) {
      console.error('更新用户权限失败:', updateError)
      return NextResponse.json({
        code: 500,
        msg: '更新用户权限失败',
        error: updateError.message
      })
    }

    console.log('更新后用户信息:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      membership_level: updatedUser.membership_level
    })

    return NextResponse.json({
      code: 200,
      msg: '✅ 成功将 13960104@qq.com 设置为管理员',
      data: {
        before: {
          role: currentUser.role,
          membership_level: currentUser.membership_level
        },
        after: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          membership_level: updatedUser.membership_level
        }
      }
    })
  } catch (error: any) {
    console.error('API执行错误:', error)
    return NextResponse.json({
      code: 500,
      msg: '服务器错误',
      error: error.message
    })
  }
}
