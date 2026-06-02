import { NextRequest } from 'next/server';
import { verifyToken } from '@/utils/jwt';

export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const decoded = verifyToken(token);
    return decoded?.userId || null;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

export async function verifyNovelOwnership(novelId: string, userId: string, client: any): Promise<boolean> {
  const { data: novel } = await client.from('novels').select('id').eq('id', novelId).eq('user_id', userId).single();
  return !!novel;
}
