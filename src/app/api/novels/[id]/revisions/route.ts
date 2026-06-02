import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyToken } from '@/utils/jwt';
import { API_CONFIG } from '@/lib/config';

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

// =====================================================
// 阶段特定的系统提示词
// =====================================================

function getPhaseSystemPrompt(phase: 'A' | 'B' | 'C'): string {
  switch (phase) {
    case 'A':
      return `你是一位专业的小说编辑，正在进行第一阶段推敲——剧情验证。

请对以下章节内容进行剧情逻辑审查：
1. 检查剧情因果关系是否合理
2. 检查情节推进是否自然
3. 检查是否有逻辑漏洞或情节断裂
4. 检查冲突设置是否有效
5. 检查节奏是否适当

输出格式（JSON）：
{
  "score": 85,
  "issues": [
    {
      "type": "plot_logic" | "pacing" | "conflict" | "continuity",
      "severity": "high" | "medium" | "low",
      "location": "第X段",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "summary": "总体评价"
}

请严格以 JSON 格式返回结果，不要包含任何其他文字。`;

    case 'B':
      return `你是一位专业的小说编辑，正在进行第二阶段推敲——整合性验证。

请检查以下章节内容与设定的一致性：
1. 角色性格、行为是否符合设定
2. 世界观规则是否被遵守
3. 时间线是否连贯
4. 角色关系是否一致
5. 伏线是否有矛盾

输出格式（JSON）：
{
  "score": 85,
  "issues": [
    {
      "type": "character" | "worldview" | "timeline" | "relationship",
      "severity": "high" | "medium" | "low",
      "location": "第X段",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "summary": "总体评价"
}

请严格以 JSON 格式返回结果，不要包含任何其他文字。`;

    case 'C':
      return `你是一位专业的小说编辑，正在进行第三阶段推敲——读者视角评估。

请从读者角度评估以下章节：
1. 开头是否吸引人
2. 情感共鸣是否充分
3. 对话是否自然
4. 描写是否生动
5. 结尾是否有吸引力
6. 整体阅读体验评分

输出格式（JSON）：
{
  "score": 85,
  "issues": [
    {
      "type": "opening" | "emotion" | "dialogue" | "description" | "ending",
      "severity": "high" | "medium" | "low",
      "location": "第X段",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "summary": "总体评价"
}

请严格以 JSON 格式返回结果，不要包含任何其他文字。`;
  }
}

// =====================================================
// 构建用户消息（包含设定上下文）
// =====================================================

function buildUserMessage(
  chapterContent: string,
  characters: any[],
  worldSettings: any[],
  plotSettings: any,
  phase: 'A' | 'B' | 'C'
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

  const phaseNames: Record<string, string> = {
    A: '剧情验证',
    B: '整合性验证',
    C: '读者视角评估',
  };

  return `${contextInfo}

## 待审查章节内容

${chapterContent}

## 审查阶段

当前为第 ${phase} 阶段推敲：${phaseNames[phase]}

请严格按照系统提示中要求的 JSON 格式返回审查结果。`;
}

// =====================================================
// 调用 DeepSeek API（SSE 流式）
// =====================================================

async function callDeepSeekStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (content: string) => void
): Promise<string> {
  const apiKey = API_CONFIG.deepseek.apiKey;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const endpoint = `${API_CONFIG.deepseek.baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: API_CONFIG.deepseek.model,
      messages: messages,
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Revision] DeepSeek API error:', response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No reader from DeepSeek API');
  }

  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return fullContent;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            const content = parsed.choices[0].delta.content;
            fullContent += content;
            onChunk(content);
          }
        } catch (e) {
          // Ignore parse errors for SSE
        }
      }
    }
  }

  return fullContent;
}

// =====================================================
// 解析 AI 返回的 JSON
// =====================================================

function parseRevisionResult(aiContent: string): {
  score: number;
  issues: any[];
  summary: string;
} {
  const defaultResult = {
    score: 0,
    issues: [],
    summary: 'AI 返回结果解析失败，请重试',
  };

  try {
    // 尝试提取 JSON 块
    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)```/) ||
                      aiContent.match(/\{[\s\S]*"score"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        summary: parsed.summary || '',
      };
    }

    // 尝试直接解析
    const parsed = JSON.parse(aiContent);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: parsed.summary || '',
    };
  } catch (parseError) {
    console.error('[Revision] JSON 解析失败:', parseError);
    console.error('[Revision] AI 返回内容:', aiContent);
    return defaultResult;
  }
}

/**
 * POST /api/novels/[id]/revisions - 运行推敲阶段
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
    const { chapterId, chapterContent, phase } = body;

    if (!chapterContent) {
      return errorResponse('缺少章节内容');
    }

    if (!phase || !['A', 'B', 'C'].includes(phase)) {
      return errorResponse('无效的推敲阶段，必须是 A、B 或 C');
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

    // 构建消息
    const systemPrompt = getPhaseSystemPrompt(phase);
    const userMessage = buildUserMessage(
      chapterContent,
      characters,
      worldSettings,
      plotSettings,
      phase
    );

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    // 使用 SSE 流式返回
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const aiContent = await callDeepSeekStream(messages, (chunk) => {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          // 解析完整结果
          const parsedResult = parseRevisionResult(aiContent);

          // 发送解析后的结构化结果
          const resultData = `data: ${JSON.stringify({ type: 'result', ...parsedResult })}\n\n`;
          controller.enqueue(encoder.encode(resultData));

          // 保存记录到数据库
          try {
            const recordData = {
              novel_id: novelId,
              chapter_id: chapterId || null,
              phase: phase,
              score: parsedResult.score,
              issues: parsedResult.issues,
              summary: parsedResult.summary,
              created_at: new Date().toISOString(),
            };

            const { data: savedRecord, error: saveError } = await client
              .from('revision_records')
              .insert(recordData)
              .select()
              .single();

            if (saveError) {
              console.error('[POST /revisions] 保存记录失败:', saveError);
            }

            // 发送记录 ID
            const recordDataMsg = `data: ${JSON.stringify({ type: 'record', recordId: savedRecord?.id || null })}\n\n`;
            controller.enqueue(encoder.encode(recordDataMsg));
          } catch (dbError) {
            console.error('[POST /revisions] 数据库操作失败:', dbError);
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('[POST /revisions] 推敲失败:', error);
          const errorData = `data: ${JSON.stringify({ error: error.message || '推敲失败' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('[POST /revisions] 推敲失败:', error);
    return errorResponse(`推敲失败: ${error.message}`, 500);
  }
}

/**
 * GET /api/novels/[id]/revisions - 获取推敲记录
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
      .from('revision_records')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /revisions] 查询错误:', error);
      throw error;
    }

    return successResponse(data || [], '获取推敲记录成功');
  } catch (error: any) {
    console.error('[GET /revisions] 获取推敲记录失败:', error);
    return errorResponse('获取推敲记录失败', 500);
  }
}
