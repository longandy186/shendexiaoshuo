import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[安全错误] JWT_SECRET 环境变量未设置！生产环境必须配置强随机密钥。');
  }
  console.warn('[安全警告] JWT_SECRET 未设置，使用开发环境默认值');
}

const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

const getSecret = (): string => {
  return JWT_SECRET || 'dev-secret-do-not-use-in-production';
};

/**
 * 生成JWT Token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 从请求头中提取Token
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
