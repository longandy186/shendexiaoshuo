import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/utils/jwt';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return null;
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

async function verifyNovelOwnership(novelId: string, userId: string, client: any): Promise<boolean> {
  const { data: novel } = await client
    .from('novels')
    .select('id')
    .eq('id', novelId)
    .eq('user_id', userId)
    .single();
  return !!novel;
}

/**
 * 构建矛盾检测的 AI 提示词
 */
function buildContradictionPrompt(
  chapterContent: string,
  characters: any[],
  worldSettings: any[],
  plotSettings: any,
  foreshadowingItems: any[]
): string {
  let contextInfo = '';

  // 角色信息
  if (characters && characters.length > 0) {
    contextInfo += '\n## 角色设定\n';
    for (const char of characters) {
      contextInfo += `- ${char.name}（${char.role || '未设定'}）：年龄${char.age || '未知'}，性格${char.personality || '未设定'}，外貌${char.appearance || '未设定'}，背景${char.background || '未设定'}\n`;
    }
  }

  // 世界观设定
  if (worldSettings && worldSettings.length > 0) {
    contextInfo += '\n## 世界观设定\n';
    for (const setting of worldSettings) {
      contextInfo += `- ${setting.name || setting.title}（${setting.category || '其他'}）：${setting.description || setting.content}\n`;
      if (setting.relationships) {
        contextInfo += `  关系：${setting.relationships}\n`;
      }
    }
  }

  // 剧情设定
  if (plotSettings) {
    contextInfo += '\n## 剧情设定\n';
    if (plotSettings.core_conflict) {
      contextInfo += `- 核心冲突：${plotSettings.core_conflict}\n`;
    }
    if (plotSettings.main_plot) {
      contextInfo += `- 主线剧情：${plotSettings.main_plot}\n`;
    }
    if (plotSettings.sub_plots && plotSettings.sub_plots.length > 0) {
      contextInfo += `- 支线剧情：${plotSettings.sub_plots.join('、')}\n`;
    }
    if (plotSettings.turning_points && plotSettings.turning_points.length > 0) {
      contextInfo += `- 转折点：${plotSettings.turning_points.join('、')}\n`;
    }
  }

  // 伏线信息
  if (foreshadowingItems && foreshadowingItems.length > 0) {
    contextInfo += '\n## 已有伏线\n';
    for (const item of foreshadowingItems) {
      contextInfo += `- ${item.name}（${item.status}）：${item.description}\n`;
    }
  }

  const prompt = `你是一位专业的小说编辑，擅长发现小说中的逻辑矛盾和设定冲突。

请仔细阅读以下小说设定和章节内容，检测其中是否存在矛盾。

${contextInfo}

## 待检测章节内容

${chapterContent}

## 检测要求

请从以下四个维度检测矛盾：
1. **角色矛盾**：角色性格、能力、外貌、背景是否前后不一致
2. **世界观矛盾**：世界观设定是否被违反，力量体系、地理、社会规则是否矛盾
3. **时间线矛盾**：时间描述是否前后矛盾，事件顺序是否合理
4. **伏线矛盾**：已埋设的伏线是否被遗忘或自相矛盾

## 输出格式

请严格以 JSON 格式返回结果，不要包含任何其他文字：

\`\`\`json
{
  "summary": "检测结果概述",
  "contradictions": [
    {
      "type": "character|worldview|timeline|foreshadowing",
      "severity": "high|medium|low",
      "description": "矛盾的具体描述",
      "location": "矛盾出现的位置（章节或段落）",
      "suggestion": "修复建议"
    }
  ]
}
\`\`\`

如果没有发现矛盾，返回：
\`\`\`json
{
  "summary": "未发现明显矛盾",
  "contradictions": []
}
\`\`\`

请现在开始检测。`;

  return prompt;
}

/**
 * POST /api/novels/[id]/contradictions - 运行矛盾检测
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const body = await request.json();
    const { chapterId, chapterContent } = body;

    if (!chapterContent) {
      return errorResponse('缺少章节内容');
    }

    // 获取小说的设定信息
    const [charactersRes, worldSettingsRes, plotSettingsRes] = await Promise.all([
      client.from('characters').select('*').eq('novel_id', novelId),
      client.from('world_settings').select('*').eq('novel_id', novelId),
      client.from('plot_settings').select('*').eq('novel_id', novelId).single(),
    ]);

    const characters = charactersRes.data || [];
    const worldSettings = worldSettingsRes.data || [];
    const plotSettings = plotSettingsRes.data || null;

    // 获取伏线信息
    const foreshadowingRes = await client
      .from('foreshadowing')
      .select('*')
      .eq('novel_id', novelId);
    const foreshadowingItems = foreshadowingRes.data || [];

    // 构建 AI 提示词
    const prompt = buildContradictionPrompt(
      chapterContent,
      characters,
      worldSettings,
      plotSettings,
      foreshadowingItems
    );

    // 调用 DeepSeek AI
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const messages = [
      {
        role: 'system' as const,
        content: '你是一位专业的小说编辑，擅长发现小说中的逻辑矛盾和设定冲突。请严格按照要求的 JSON 格式返回结果。',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    // 使用流式调用获取完整结果
    const response = llmClient.stream(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3,
    });

    let aiContent = '';
    for await (const chunk of response) {
      if (chunk.content) {
        aiContent += chunk.content.toString();
      }
    }

    // 解析 AI 返回的 JSON
    let parsedResult: any = { summary: '解析失败', contradictions: [] };
    try {
      // 尝试提取 JSON 块
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)```/) ||
                        aiContent.match(/\{[\s\S]*"contradictions"[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('[POST /contradictions] JSON 解析失败:', parseError);
      console.error('[POST /contradictions] AI 返回内容:', aiContent);
      parsedResult = {
        summary: 'AI 返回结果解析失败，请重试',
        contradictions: [],
        rawContent: aiContent,
      };
    }

    // 保存检测记录到数据库
    const recordData = {
      novel_id: novelId,
      chapter_id: chapterId || null,
      summary: parsedResult.summary || '',
      contradictions: parsedResult.contradictions || [],
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    const { data: savedRecord, error: saveError } = await client
      .from('contradiction_checks')
      .insert(recordData)
      .select()
      .single();

    if (saveError) {
      console.error('[POST /contradictions] 保存记录失败:', saveError);
      // 即使保存失败也返回检测结果
    }

    // 按类型分组
    const groupedContradictions: Record<string, any[]> = {
      character: [],
      worldview: [],
      timeline: [],
      foreshadowing: [],
    };

    for (const c of (parsedResult.contradictions || [])) {
      const type = c.type || 'unknown';
      if (groupedContradictions[type]) {
        groupedContradictions[type].push(c);
      } else {
        groupedContradictions['character'].push(c);
      }
    }

    return successResponse({
      summary: parsedResult.summary,
      contradictions: parsedResult.contradictions || [],
      grouped: groupedContradictions,
      recordId: savedRecord?.id || null,
      total: (parsedResult.contradictions || []).length,
    }, '矛盾检测完成');
  } catch (error: any) {
    console.error('[POST /contradictions] 矛盾检测失败:', error);
    return errorResponse(`矛盾检测失败: ${error.message}`, 500);
  }
}

/**
 * GET /api/novels/[id]/contradictions - 获取矛盾检测记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return errorResponse('未登录', 401);

    const client = getSupabaseClient();
    const { id: novelId } = await params;

    const hasPermission = await verifyNovelOwnership(novelId, userId, client);
    if (!hasPermission) return errorResponse('无权操作', 403);

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    let query = client
      .from('contradiction_checks')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /contradictions] 查询错误:', error);
      throw error;
    }

    return successResponse(data || [], '获取矛盾检测记录成功');
  } catch (error: any) {
    console.error('[GET /contradictions] 获取矛盾检测记录失败:', error);
    return errorResponse('获取矛盾检测记录失败', 500);
  }
}
