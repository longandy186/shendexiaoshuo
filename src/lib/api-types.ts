/**
 * 接口响应格式定义
 * 符合技术文档 6.1 接口整体规范
 */

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
}

export interface ApiError {
  code: number;
  msg: string;
  data?: any;
  timestamp: number;
}

/**
 * 状态码定义
 * 符合技术文档 6.1 状态码规范
 */
export const StatusCode = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  AI_SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * 成功响应工厂函数
 */
export function successResponse<T>(data: T, msg: string = '请求成功'): ApiResponse<T> {
  return {
    code: StatusCode.SUCCESS,
    msg,
    data,
    timestamp: Date.now(),
  };
}

/**
 * 错误响应工厂函数
 */
export function errorResponse(code: number, msg: string, data?: any): ApiError {
  return {
    code,
    msg,
    data,
    timestamp: Date.now(),
  };
}
