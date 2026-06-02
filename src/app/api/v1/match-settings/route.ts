import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface CharacterData {
  name: string;
  age?: number;
  appearance?: string;
  personality?: string;
  background?: string;
  role?: string;
}

interface WorldSettingData {
  category?: string;
  title: string;
  content: string;
}

interface MatchRequest {
  novelId: string;
  characters: CharacterData[];
  worldSettings: WorldSettingData[];
  overwrite: boolean; // 是否覆盖现有数据
}

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

function errorResponse(message: string, code: number = 400, data: any = null) {
  return NextResponse.json({
    code,
    msg: message,
    data,
    timestamp: new Date().toISOString(),
  }, { status: code });
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return errorResponse('请先登录', 401);
    }

    const body: MatchRequest = await request.json();
    const { novelId, characters, worldSettings, overwrite } = body;

    console.log('[Match Settings] 接收到请求:', {
      novelId,
      charactersCount: characters?.length,
      worldSettingsCount: worldSettings?.length,
      overwrite
    });

    const client = getSupabaseClient();

    // 验证小说存在且属于当前用户
    const { data: novel, error: novelError } = await client
      .from('novels')
      .select('id, user_id')
      .eq('id', novelId)
      .single();

    if (novelError || !novel) {
      console.error('[Match Settings] 小说不存在:', novelId);
      return errorResponse('小说不存在', 404);
    }

    // 验证用户权限
    if (novel.user_id !== auth.user!.id) {
      return errorResponse('无权操作', 403);
    }

    let addedCharacters = 0;
    let updatedCharacters = 0;
    let addedWorldSettings = 0;
    let updatedWorldSettings = 0;

    // 处理角色匹配
    for (const charData of characters) {
      // 查找同名角色
      const { data: existingCharacter } = await client
        .from('characters')
        .select('id')
        .eq('novel_id', novelId)
        .eq('name', charData.name)
        .single();

      if (existingCharacter) {
        if (overwrite) {
          // 处理age字段
          let ageValue: number | null = null;
          if (charData.age !== null && charData.age !== undefined) {
            if (typeof charData.age === 'number') {
              ageValue = charData.age;
            } else if (typeof charData.age === 'string') {
              const num = parseInt(charData.age, 10);
              if (!isNaN(num)) ageValue = num;
            }
          }

          const { error } = await client
            .from('characters')
            .update({
              age: ageValue,
              appearance: charData.appearance || '',
              personality: charData.personality || '',
              background: charData.background || '',
              role: charData.role || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCharacter.id);

          if (error) {
            console.error('[Match Settings] 更新角色失败:', error);
          } else {
            updatedCharacters++;
          }
        }
      } else {
        // 处理age字段
        let ageValue: number | null = null;
        if (charData.age !== null && charData.age !== undefined) {
          if (typeof charData.age === 'number') {
            ageValue = charData.age;
          } else if (typeof charData.age === 'string') {
            const num = parseInt(charData.age, 10);
            if (!isNaN(num)) ageValue = num;
          }
        }

        const { error } = await client
          .from('characters')
          .insert({
            novel_id: novelId,
            name: charData.name,
            age: ageValue,
            appearance: charData.appearance || '',
            personality: charData.personality || '',
            background: charData.background || '',
            role: charData.role || 'supporting',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('[Match Settings] 添加角色失败:', error);
        } else {
          addedCharacters++;
        }
      }
    }

    // 处理世界观设定匹配
    for (const settingData of worldSettings) {
      console.log('[Match Settings] 处理世界观设定:', settingData);

      const title = settingData.title || '';
      const MAX_NAME_LENGTH = 256;
      const truncatedTitle = title.length > MAX_NAME_LENGTH ? title.substring(0, MAX_NAME_LENGTH) : title;

      // 查找同名设定
      const { data: existingSetting } = await client
        .from('world_settings')
        .select('id')
        .eq('novel_id', novelId)
        .eq('name', truncatedTitle)
        .single();

      if (existingSetting) {
        if (overwrite) {
          console.log('[Match Settings] 更新现有设定:', existingSetting.id);
          const { error } = await client
            .from('world_settings')
            .update({
              category: settingData.category || '其他',
              name: truncatedTitle,
              description: settingData.content || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSetting.id);

          if (error) {
            console.error('[Match Settings] 更新设定失败:', error);
          } else {
            updatedWorldSettings++;
          }
        } else {
          console.log('[Match Settings] 跳过现有设定（overwrite=false）:', existingSetting.id);
        }
      } else {
        console.log('[Match Settings] 添加新设定:', settingData.title);
        const { error } = await client
          .from('world_settings')
          .insert({
            novel_id: novelId,
            category: settingData.category || '其他',
            name: truncatedTitle,
            description: settingData.content || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('[Match Settings] 添加设定失败:', error);
        } else {
          addedWorldSettings++;
        }
      }
    }

    return successResponse({
      addedCharacters,
      updatedCharacters,
      addedWorldSettings,
      updatedWorldSettings,
    }, '匹配设定成功');
  } catch (error) {
    console.error('匹配设定失败:', error);
    return errorResponse('匹配设定失败', 500);
  }
}
