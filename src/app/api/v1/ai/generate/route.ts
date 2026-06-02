import { NextRequest } from 'next/server';
import { successResponse, errorResponse, StatusCode } from '@/lib/api-types';
import { API_CONFIG } from '@/lib/config';
import { verifyAuth } from '@/utils/auth';
import {
  dbGetNovelSettingsForAI,
  dbGetPriorityWorldSettings,
  dbGetPriorityCharacters,
} from '@/lib/database-storage';
import { getLanguageStyleById } from '@/lib/prompt-library';
import { getPromptTemplate, renderPrompt } from '@/lib/prompt-manager';

interface GenerateRequest {
  type: 'outline' | 'chapter' | 'continue' | 'character' | 'plot' | 'polish' | 'suspense' | 'romance' | 'cool' | 'expand' | 'remove-ai-trace' | 'revision' | 'contradiction' | 'foreshadowing';
  prompt: string;
  model?: string;
  languageStyle?: string; // 语言风格ID
  wordCountGoal?: number; // 目标字数
  plotDirection?: string; // 剧情走向
  narrativePerspective?: string; // 人称视角
  context?: {
    novelId?: string;
    chapterId?: string;
    chapterTitle?: string;
    chapterKeywords?: string;
    previousContent?: string;
    characters?: any[];
    worldSettings?: any[];
    chapterCount?: number;
    genre?: string;
  };
}

/**
 * 调用 DeepSeek API（OpenAI 兼容格式，SSE 流式）
 */
async function callDeepSeekAPI(
  messages: Array<{ role: string; content: string }>,
  onChunk: (content: string) => void
): Promise<void> {
  const apiKey = API_CONFIG.deepseek.apiKey;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在环境变量中设置 DEEPSEEK_API_KEY');
  }

  const endpoint = `${API_CONFIG.deepseek.baseUrl}/chat/completions`;
  console.log('[AI Generate] DeepSeek API endpoint:', endpoint);
  console.log('[AI Generate] DeepSeek model:', API_CONFIG.deepseek.model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: API_CONFIG.deepseek.model,
      messages: messages,
      temperature: 0.8,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI Generate] DeepSeek API error:', response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No reader from DeepSeek API');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            onChunk(parsed.choices[0].delta.content);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return Response.json(
        errorResponse(StatusCode.UNAUTHORIZED, '请先登录'),
        { status: 401 }
      );
    }

    // 参数校验
    const body = await request.json();

    if (!body.type || !body.prompt) {
      return Response.json(
        errorResponse(StatusCode.BAD_REQUEST, '缺少必要参数：type 和 prompt'),
        { status: 400 }
      );
    }

    const { type, prompt, model, languageStyle, wordCountGoal, plotDirection, narrativePerspective, context } = body as GenerateRequest;

    console.log('[AI Generate] 生成请求:', {
      type,
      model: model || 'default (DeepSeek V4)',
      languageStyle,
      wordCountGoal,
      plotDirection,
      narrativePerspective,
      hasContext: !!context,
      hasCharacters: context?.characters?.length || 0,
      hasWorldSettings: context?.worldSettings?.length || 0,
      novelId: context?.novelId,
    });

    // 【核心修改】优先从数据库读取世界观和角色设定
    let enhancedContext = context || {};

    // 如果提供了novelId，从数据库读取设定（最高优先级）
    if (context?.novelId) {
      console.log('[AI Generate] 从数据库读取设定，novelId:', context.novelId);
      try {
        const dbSettings = await dbGetNovelSettingsForAI(context.novelId);

        // 数据库中的设定具有最高优先级，覆盖前端传递的设定
        if (dbSettings.worldSettings && dbSettings.worldSettings.length > 0) {
          console.log('[AI Generate] 使用数据库中的世界观设定，数量:', dbSettings.worldSettings.length);
          enhancedContext.worldSettings = dbSettings.worldSettings;
        }

        if (dbSettings.characters && dbSettings.characters.length > 0) {
          console.log('[AI Generate] 使用数据库中的角色设定，数量:', dbSettings.characters.length);
          enhancedContext.characters = dbSettings.characters;
        }
      } catch (error) {
        console.error('[AI Generate] 从数据库读取设定失败，使用前端传递的设定:', error);
      }
    }

    // 验证 type 参数
    const validTypes = ['outline', 'chapter', 'continue', 'character', 'plot', 'polish', 'suspense', 'romance', 'cool', 'expand', 'remove-ai-trace', 'revision', 'contradiction', 'foreshadowing'];
    if (!validTypes.includes(type)) {
      return Response.json(
        errorResponse(StatusCode.BAD_REQUEST, `无效的 type 参数，必须是: ${validTypes.join(', ')}`),
        { status: 400 }
      );
    }

    // 【新增】获取语言风格提示词
    let languageStylePrompt = '';
    if (languageStyle && languageStyle !== 'none') {
      const style = getLanguageStyleById(languageStyle);
      if (style) {
        console.log('[AI Generate] 使用语言风格:', style.name);
        languageStylePrompt = style.prompt;
      } else {
        console.warn('[AI Generate] 未找到语言风格:', languageStyle, '使用默认风格');
      }
    } else {
      console.log('[AI Generate] 不使用特殊语言风格');
    }

    // 【新增】临时参数提示词（目标字数、剧情走向、人称视角）
    const targetWordCount = wordCountGoal || 500; // 默认500字
    const minWordCount = Math.floor(targetWordCount * 0.9); // 最小字数：90%
    const maxWordCount = Math.ceil(targetWordCount * 1.1); // 最大字数：110%

    // 构建剧情走向提示
    let plotDirectionPrompt = '';
    const plotDirectionMap: Record<string, string> = {
      'continue': '自然续写',
      'highlight': '爽点爆发',
      'buildup': '剧情铺垫',
      'twist': '反转',
      'branch': '支线展开'
    };
    if (plotDirection && plotDirectionMap[plotDirection]) {
      plotDirectionPrompt = `剧情走向：${plotDirectionMap[plotDirection]}\n`;
    }

    // 构建人称视角提示
    let perspectivePrompt = '';
    const perspectiveMap: Record<string, string> = {
      'first': '第一人称（我）',
      'third': '第三人称（他/她/它）',
      'omniscient': '全知视角（上帝视角）'
    };
    if (narrativePerspective && perspectiveMap[narrativePerspective]) {
      perspectivePrompt = `叙述视角：${perspectiveMap[narrativePerspective]}\n`;
    }

    // 【核心新增】临时参数提示词（严格字数控制）
    const tempParamsPrompt = `
【生成参数控制】
目标字数：${targetWordCount}字（误差范围：${minWordCount}-${maxWordCount}字）
${plotDirectionPrompt}${perspectivePrompt}
【强制要求】
1. 必须严格控制在${minWordCount}-${maxWordCount}字之间
2. 达到目标字数后立即结束，不要继续生成
3. 保持段落完整，不要在句子中间截断
`;

    console.log('[AI Generate] 字数控制:', {
      target: targetWordCount,

      min: minWordCount,
      max: maxWordCount
    });

    // Build system prompt based on request type
    let systemPrompt = '';

    // 构建角色和世界观设定的基础信息
    let baseContextInfo = '';

    if (enhancedContext?.characters && enhancedContext.characters.length > 0) {
      baseContextInfo += '\n【角色设定】\n';
      enhancedContext.characters.forEach((c: any) => {
        let charInfo = `角色：${c.name}\n`;
        if (c.age) charInfo += `- 年龄：${c.age}\n`;
        if (c.appearance) charInfo += `- 外貌：${c.appearance}\n`;
        if (c.personality) charInfo += `- 性格：${c.personality}\n`;
        if (c.background) charInfo += `- 背景：${c.background}\n`;
        if (c.role) charInfo += `- 定位：${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : c.role === 'supporting' ? '配角' : '次要角色'}\n`;
        baseContextInfo += charInfo + '\n';
      });
    }

    if (enhancedContext?.worldSettings && enhancedContext.worldSettings.length > 0) {
      baseContextInfo += '【世界观设定】\n';
      enhancedContext.worldSettings.forEach((s: any) => {
        baseContextInfo += `- ${s.title}（${s.category}）：${s.content}\n`;
      });
      baseContextInfo += '\n';
    }

    // 重要提示：必须严格遵守角色和世界观设定
    baseContextInfo += '\n【重要要求】\n';
    baseContextInfo += '1. 必须严格遵守以上所有角色设定，保持角色性格、外貌、背景的一致性\n';
    baseContextInfo += '2. 必须遵守世界观设定，包括地理环境、魔法系统、政治体系等\n';
    baseContextInfo += '3. 严禁创造与设定冲突的内容\n';
    baseContextInfo += '4. 严禁随意修改角色性格和背景\n';
    baseContextInfo += '5. 如果需要发展剧情，必须基于现有设定合理展开\n';
    baseContextInfo += '6. 【最高优先级】以上角色和世界观设定来自数据库，具有最高优先级，任何与之冲突的内容都应放弃\n';
    baseContextInfo += '\n';

    switch (type) {
      case 'outline':
        systemPrompt = `你是一位专业的小说大纲设计师。请根据用户提供的小说信息，创作详细的章节大纲。
要求：
1. 大纲应该包含15-30个章节
2. 每个章节要有明确的故事情节和发展
3. 确保情节连贯，节奏合理
4. 包含主要冲突和转折点
5. 适合${context?.genre || '小说'}类型

${baseContextInfo}

${languageStylePrompt}`;

        break;

      case 'chapter':
        systemPrompt = `你是一位专业的小说作家。请根据提供的大纲和上下文，创作精彩的章节内容。
要求：
1. 语言生动，情节引人入胜
2. 注意人物性格和对话的合理性，必须符合角色设定
3. 必须遵守世界观设定
4. 注意段落结构和节奏控制
${plotDirectionPrompt}${perspectivePrompt}

${baseContextInfo}

${languageStylePrompt}

${tempParamsPrompt}`;

        break;

      case 'continue':
        systemPrompt = `你是一位专业的小说作家。请根据已有的章节内容，智能续写接下来的故事。
要求：
1. 保持与前面内容的一致性
2. 继续推动情节发展，但必须基于角色和世界观设定
3. 保持人物性格稳定，严禁性格突变
4. 语言风格统一
${plotDirectionPrompt}${perspectivePrompt}

${baseContextInfo}

${languageStylePrompt}

${tempParamsPrompt}`;

        break;

      case 'character':
        systemPrompt = `你是一位专业的人物设计师。请根据用户的描述，创建详细的角色档案。
要求：
1. 包括姓名、年龄、外貌特征
2. 详细的人物性格和心理特征
3. 背景故事和动机
4. 在故事中的定位和作用
5. 与其他角色的关系

${languageStylePrompt}`;
        break;

      case 'plot':
        systemPrompt = `你是一位专业的剧情设计师。请为用户提供创意的剧情发展建议。
要求：
1. 提供3-5个不同方向的剧情发展选项
2. 每个选项都要有创意和可行性
3. 考虑故事的连贯性和逻辑性
4. 包含潜在冲突和转折
5. 确保符合故事的类型和风格

${languageStylePrompt}`;
        break;

      case 'polish':
        systemPrompt = `你是一位专业的小说编辑和润色专家。请对用户提供的小说内容进行全文润色。
要求：
1. 优化语言表达，使文字更加生动流畅
2. 调整节奏，增强故事的张力和可读性
3. 优化对话，使其更加自然贴合人物性格
4. 增强场景描写和情感渲染
5. 保持原文的核心情节和风格不变
6. 确保不改变角色性格和世界观设定

${baseContextInfo}

${languageStylePrompt}`;
        break;

      case 'suspense':
        systemPrompt = `你是一位专业的悬疑推理小说作家。请根据用户提供的信息，创作悬疑推理情节。
要求：
1. 设置悬念和谜团，引发读者好奇
2. 逐步揭示线索，层层递进
3. 制造紧张氛围，让读者产生猜测
4. 线索要合理且有据可依
5. 推理过程要严密逻辑
6. 在适当的时候设置反转，反转要有伏笔
7. 用环境和细节营造紧张感

${baseContextInfo}

${languageStylePrompt}

${tempParamsPrompt}`;
        break;

      case 'romance':
        systemPrompt = `你是一位专业的古风言情小说作家。请根据用户提供的信息，创作古风言情情节。
要求：
1. 使用古风词汇和典雅表达
2. 注重意境的营造和情感的渲染
3. 语言优美，富有诗意
4. 细腻刻画人物的内心情感
5. 通过细节展现人物的情感变化
6. 情感描写要真挚动人
7. 营造古典雅致的场景氛围
8. 用景物烘托人物情感

${baseContextInfo}

${languageStylePrompt}

${tempParamsPrompt}`;
        break;

      case 'cool':
        systemPrompt = `你是一位专业的爽文作家。请根据用户提供的信息，创作爽快解气的情节。
要求：
1. 设置独特且有趣的金手指
2. 金手指要合理且有逻辑
3. 先展示主角的困境和弱势
4. 通过金手指实现逆袭
5. 逆袭过程要爽快解气
6. 合理安排爽点，不能太密也不能太疏
7. 每个爽点都要有层次感
8. 通过反派衬托主角
9. 反派不要太弱，要有挑战性
10. 逆袭后的对比要明显

${baseContextInfo}

${languageStylePrompt}

${tempParamsPrompt}`;
        break;

      case 'expand':
        // 使用提示词管理中的智能扩写模板
        try {
          const promptTemplate = getPromptTemplate('expand');
          if (promptTemplate) {
            console.log('[AI Generate] 使用智能扩写提示词模板');

            // 准备变量
            const characters = enhancedContext?.characters || [];
            const worldSettings = enhancedContext?.worldSettings || [];

            // 构建角色设定文本
            const charactersText = characters.map((c: any) =>
              `角色：${c.name}\n年龄：${c.age || '未知'}\n外貌：${c.appearance || '未知'}\n性格：${c.personality || '未知'}\n背景：${c.background || '未知'}\n定位：${c.role || '配角'}`
            ).join('\n\n');

            // 构建世界观设定文本
            const worldSettingsText = worldSettings.map((s: any) =>
              `${s.title}（${s.category}）：${s.content}`
            ).join('\n');

            // 构建主要角色提醒
            const mainCharacters = characters
              .filter((c: any) => ['protagonist', 'antagonist', 'supporting'].includes(c.role))
              .map((c: any) => `- ${c.name}：${c.personality || '性格未设定'}`)
              .join('\n');

            // 构建关键世界观设定
            const keyWorldSettings = worldSettings
              .slice(0, 5)
              .map((s: any) => `- ${s.title}：${s.content.substring(0, 100)}${s.content.length > 100 ? '...' : ''}`)
              .join('\n');

            systemPrompt = renderPrompt(promptTemplate, {
              chapterTitle: enhancedContext?.chapterTitle || '',
              chapterKeywords: enhancedContext?.chapterKeywords || '',
              originalContent: enhancedContext?.previousContent || prompt,
              characters: charactersText,
              worldSettings: worldSettingsText,
              mainCharacters: mainCharacters,
              keyWorldSettings: keyWorldSettings,
            }).systemPrompt;
          } else {
            console.warn('[AI Generate] 未找到智能扩写提示词模板，使用默认提示词');
            systemPrompt = `你是一位专业的小说扩写专家，擅长将简短的段落或剧情点扩写为生动丰富的内容。
要求：
1. 保持原有情节和核心冲突不变
2. 增加环境描写，营造氛围
3. 丰富人物对话，展现角色性格
4. 细化动作和心理描写
5. 加入感官细节（视觉、听觉、嗅觉、触觉等）
6. 合理控制篇幅，确保扩写内容与原文比例适中
7. 确保扩写后的内容自然流畅，不显冗余

${baseContextInfo}

${languageStylePrompt}`;
          }
        } catch (error) {
          console.error('[AI Generate] 智能扩写提示词模板加载失败:', error);
          systemPrompt = `你是一位专业的小说扩写专家，请对提供的内容进行智能扩写，丰富细节和情节。

${baseContextInfo}`;
        }
        break;

      case 'remove-ai-trace':
        // 使用提示词管理中的除AI痕迹模板
        try {
          const promptTemplate = getPromptTemplate('remove-ai-trace');
          if (promptTemplate) {
            console.log('[AI Generate] 使用除AI痕迹提示词模板');

            systemPrompt = promptTemplate.systemPrompt + '\n\n' + languageStylePrompt;
          } else {
            console.warn('[AI Generate] 未找到除AI痕迹提示词模板，使用默认提示词');
            systemPrompt = `你是一位专业的文字润色专家，擅长去除AI生成文本中的机械化痕迹，使文字更加自然、流畅，更像人类写作。
要求：
1. 避免过度使用"首先、其次、再次、最后"等序数词
2. 减少使用"总之、综上所述、总而言之"等总结性短语
3. 避免过度使用"不仅、而且、同时、此外"等连接词
4. 减少使用"值得注意的是、值得一提的是"等提醒性短语
5. 避免句子结构过于工整、重复
6. 增加自然的口语化表达
7. 使用更丰富的词汇和句式
8. 确保不改变角色性格和世界观设定

${baseContextInfo}

${languageStylePrompt}`;
          }
        } catch (error) {
          console.error('[AI Generate] 除AI痕迹提示词模板加载失败:', error);
          systemPrompt = `你是一位专业的文字润色专家，请去除文本中的AI生成痕迹，使文字更加自然、像人类写作。

${baseContextInfo}`;
        }
        break;

      case 'revision':
        // 推敲/修订 - 占位系统提示词
        systemPrompt = `你是一位专业的小说编辑和修订专家。请对用户提供的小说内容进行推敲和修订。
要求：
1. 逐段审阅内容，找出逻辑漏洞和不合理之处
2. 检查人物行为是否符合角色设定和性格
3. 检查情节发展是否合理、连贯
4. 优化语言表达，消除冗余和重复
5. 提出具体的修改建议和修订后的文本
6. 确保修订后的内容保持原有风格和设定的一致性

${baseContextInfo}

${languageStylePrompt}`;
        break;

      case 'contradiction':
        // 矛盾检测 - 占位系统提示词
        systemPrompt = `你是一位专业的小说逻辑审查专家。请对用户提供的小说内容进行矛盾检测。
要求：
1. 仔细阅读内容，找出前后矛盾之处
2. 检查角色设定是否前后一致（外貌、性格、背景等）
3. 检查时间线是否合理，有无时间矛盾
4. 检查世界观设定是否被违反
5. 检查人物行为是否符合动机和性格
6. 列出所有发现的矛盾，并说明具体位置和原因
7. 对每个矛盾提供修复建议

${baseContextInfo}`;
        break;

      case 'foreshadowing':
        // 伏线分析 - 占位系统提示词
        systemPrompt = `你是一位专业的小说结构分析专家。请对用户提供的小说内容进行伏线分析。
要求：
1. 找出文中已铺设的伏笔和暗示
2. 分析每条伏线的埋设方式和效果
3. 判断哪些伏线已经回收，哪些尚未回收
4. 评估伏线的合理性（是否自然、是否有足够铺垫）
5. 提出后续情节中回收伏线的建议
6. 建议可以新增的伏线以增强故事的深度和连贯性

${baseContextInfo}`;
        break;

      default:
        systemPrompt = '你是一位专业的小说创作助手，请帮助用户创作小说内容。';
    }

    // Build messages with context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    // Add context if available
    let userContent = prompt;

    if (enhancedContext?.previousContent) {
      userContent = `\n【前文内容】\n${enhancedContext.previousContent}\n\n【你的任务】\n${prompt}`;
    }

    // 添加章节信息（如果有）
    if (enhancedContext?.chapterId && enhancedContext?.chapterTitle) {
      userContent = `【章节信息】\n章节标题：${enhancedContext.chapterTitle}\n${enhancedContext.chapterKeywords ? `章节关键词：${enhancedContext.chapterKeywords}\n` : ''}\n\n${userContent}`;
    }

    if (enhancedContext?.characters && enhancedContext.characters.length > 0) {
      // 如果 system prompt 中已经包含了角色信息，这里可以不重复
      // 但为了加强效果，可以再次强调关键角色
      const mainCharacters = enhancedContext.characters
        .filter((c: any) => ['protagonist', 'antagonist', 'supporting'].includes(c.role))
        .map((c: any) => `- ${c.name}：${c.personality || '性格未设定'}`)
        .join('\n');
      if (mainCharacters) {
        userContent += `\n\n【主要角色提醒】\n${mainCharacters}`;
      }
    }

    if (enhancedContext?.worldSettings && enhancedContext.worldSettings.length > 0) {
      // 提取关键的世界观设定
      const keySettings = enhancedContext.worldSettings
        .slice(0, 5) // 只取前5个最重要的设定
        .map((s: any) => `- ${s.title}：${s.content.substring(0, 100)}${s.content.length > 100 ? '...' : ''}`)
        .join('\n');
      userContent += `\n\n【关键世界观设定】\n${keySettings}`;
    }

    messages[1] = { role: 'user', content: userContent };

    // 使用 DeepSeek V4 API 进行流式生成
    console.log('[AI Generate] 使用 DeepSeek V4 API 调用模型:', API_CONFIG.deepseek.model);

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await callDeepSeekAPI(messages, (content: string) => {
            const data = `data: ${JSON.stringify({ content })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('[AI Generate] DeepSeek API 调用失败:', error);
          const errorMessage = error.message || 'DeepSeek generation failed';
          const errorData = `data: ${JSON.stringify({ error: errorMessage, details: 'DeepSeek API 调用失败，请检查 API Key 和网络连接' })}\n\n`;
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
    console.error('API error:', error);

    // 判断错误类型，返回不同的状态码
    if (error.message?.includes('token') || error.message?.includes('auth')) {
      return Response.json(
        errorResponse(StatusCode.UNAUTHORIZED, '认证失败，请重新登录'),
        { status: 401 }
      );
    }

    if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
      return Response.json(
        errorResponse(StatusCode.FORBIDDEN, '权限不足'),
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return Response.json(
        errorResponse(StatusCode.NOT_FOUND, '资源不存在'),
        { status: 404 }
      );
    }

    if (error.message?.includes('AI') || error.message?.includes('model') || error.message?.includes('DeepSeek')) {
      return Response.json(
        errorResponse(StatusCode.AI_SERVICE_UNAVAILABLE, 'AI 服务暂时不可用，请稍后重试'),
        { status: 503 }
      );
    }

    return Response.json(
      errorResponse(StatusCode.SERVER_ERROR, '服务器内部错误'),
      { status: 500 }
    );
  }
}
