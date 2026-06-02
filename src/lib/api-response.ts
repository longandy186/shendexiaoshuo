import { NextResponse } from 'next/server';

export function successResponse(data: any, message: string = '操作成功') {
  return NextResponse.json({
    code: 200, msg: message, data,
    timestamp: new Date().toISOString(),
  });
}

export function errorResponse(message: string, code: number = 400, data: any = null) {
  return NextResponse.json({
    code, msg: message, data,
    timestamp: new Date().toISOString(),
  }, { status: code });
}
