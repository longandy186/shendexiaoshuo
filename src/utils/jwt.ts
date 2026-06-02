import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[安全错误] JWT_SECRET 环境变量未设置！生产环境必须配置强随机密钥。');
    }
    console.warn('[安全警告] JWT_SECRET 未设置，使用开发环境默认值');
    return 'dev-secret-do-not-use-in-production';
  }
  return secret;
};

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
