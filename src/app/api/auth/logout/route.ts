import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    // 清除Cookie
    const response = successResponse(null, '登出成功');

    response.cookies.delete('auth_token');

    return response;
  } catch (error: any) {
    console.error('登出失败:', error);
    return NextResponse.json({
      code: 500,
      msg: '服务器错误',
      data: null,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
