import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getPromptTemplate, renderPrompt } from '@/lib/prompt-manager';
import mammoth from 'mammoth';

/**
 * 文档解析API
 * 使用AI智能提取文档中的角色和世界观设定
 */

/**
 * 优化文档内容：去重 + 智能保留
 * 1. 移除连续重复的段落、句子、短语
 * 2. 优先保留包含角色和世界观信息的段落
 */
function optimizeDocumentContent(content: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  console.log('[Optimize Document] 开始优化文档内容...');

  // 1. 规范化空白字符
  let optimized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')  // 多个空格压缩为一个
    .replace(/\n{3,}/g, '\n\n'); // 多个换行压缩为两个

  // 2. 按段落分割
  const paragraphs = optimized.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  
  // 3. 移除连续重复的段落（完全相同或高度相似）
  const uniqueParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();
  const normalizedSeen = new Set<string>();

  for (const para of paragraphs) {
    // 完全匹配检查
    if (seenParagraphs.has(para)) {
      console.log('[Optimize Document] 跳过完全重复的段落:', para.substring(0, 50));
      continue;
    }

    // 规范化匹配检查（移除空格和标点后的相似度检查）
    const normalized = para
      .replace(/[，。！？；：、""''（）\[\]\{\}.,!?;:()\[\]\{\}]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (normalizedSeen.has(normalized)) {
      console.log('[Optimize Document] 跳过高度相似的段落:', para.substring(0, 50));
      continue;
    }

    uniqueParagraphs.push(para);
    seenParagraphs.add(para);
    normalizedSeen.add(normalized);
  }

  console.log('[Optimize Document] 段落去重:', paragraphs.length, '->', uniqueParagraphs.length);

  // 4. 按重要性排序段落
  // 关键词：用于识别段落的重要性
  const importanceKeywords = [
    // 角色相关
    '角色', '人物', '姓名', '年龄', '外貌', '性格', '背景', '设定', '主角', '反派',
    '他', '她', '他/她', '名字', '样子', '特点', '经历',
    // 世界观相关
    '世界', '背景', '设定', '历史', '地理', '魔法', '科技', '种族', '宗教', '政治',
    '规则', '体系', '能力', '等级', '组织', '势力',
    // 小说相关
    '故事', '剧情', '情节', '发展', '冲突', '结局', '开头', '结尾',
  ];

  const scoredParagraphs = uniqueParagraphs.map(para => {
    let score = 0;
    const lowerPara = para.toLowerCase();

    // 根据关键词打分
    importanceKeywords.forEach(keyword => {
      if (lowerPara.includes(keyword)) {
        score += 1;
      }
    });

    // 长度加成（适中长度的段落更有价值）
    const length = para.length;
    if (length >= 50 && length <= 500) {
      score += 2; // 适中长度
    } else if (length > 500) {
      score += 1; // 较长段落
    }

    return { para, score };
  });

  // 按分数降序排序
  scoredParagraphs.sort((a, b) => b.score - a.score);

  // 5. 重新组装（保持一定程度的原始顺序）
  // 将高分段落放在前面，低分段落放在后面
  const sortedParagraphs = scoredParagraphs.map(item => item.para);

  optimized = sortedParagraphs.join('\n\n');

  console.log('[Optimize Document] 优化完成:', {
    originalLength: content.length,
    optimizedLength: optimized.length,
    reductionRate: ((1 - optimized.length / content.length) * 100).toFixed(2) + '%',
  });

  return optimized;
}

/**
 * 智能裁剪文档
 * 优先保留重要的段落，而不是简单截断
 */
function smartTruncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  console.log('[Smart Truncate] 开始智能裁剪...');

  // 按段落分割
  const paragraphs = content.split('\n').map(p => p.trim()).filter(p => p.length > 0);

  // 计算段落重要性
  const importanceKeywords = [
    '角色', '人物', '姓名', '年龄', '外貌', '性格', '背景', '设定',
    '世界', '历史', '地理', '魔法', '科技', '种族', '宗教', '政治',
    '他', '她', '主角', '反派',
  ];

  const scoredParagraphs = paragraphs.map(para => {
    let score = 0;
    const lowerPara = para.toLowerCase();

    importanceKeywords.forEach(keyword => {
      if (lowerPara.includes(keyword)) {
        score += 1;
      }
    });

    return { para, score };
  });

  // 按分数降序排序
  scoredParagraphs.sort((a, b) => b.score - a.score);

  // 贪婪算法：选择最高分的段落，直到达到长度限制
  const selectedParagraphs: string[] = [];
  let currentLength = 0;

  for (const item of scoredParagraphs) {
    const paraWithNewline = (selectedParagraphs.length > 0 ? '\n\n' : '') + item.para;
    if (currentLength + paraWithNewline.length > maxLength) {
      break;
    }
    selectedParagraphs.push(item.para);
    currentLength += paraWithNewline.length;
  }

  // 如果还有空间，尝试添加一些低分段落
  const remainingParagraphs = scoredParagraphs
    .slice(selectedParagraphs.length)
    .filter(item => !selectedParagraphs.includes(item.para));

  for (const item of remainingParagraphs) {
    const paraWithNewline = (selectedParagraphs.length > 0 ? '\n\n' : '') + item.para;
    if (currentLength + paraWithNewline.length > maxLength) {
      break;
    }
    selectedParagraphs.push(item.para);
    currentLength += paraWithNewline.length;
  }

  const truncatedContent = selectedParagraphs.join('\n\n');

  console.log('[Smart Truncate] 裁剪完成:', {
    originalLength: content.length,
    truncatedLength: truncatedContent.length,
    selectedCount: selectedParagraphs.length,
    totalCount: paragraphs.length,
  });

  return truncatedContent;
}
export async function POST(request: NextRequest) {
  // 将变量声明移到try块之外，确保在catch块中可以访问
  let documentContent = '';
  let response: any = null;
  let aiContent = '';
  let hasError = false;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到上传的文件' },
        { status: 400 }
      );
    }

    console.log('[Parse Document] 开始解析文档:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // 读取文件内容
    documentContent = '';
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    hasError = false;

    // 判断文件类型
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // TXT文件
      const buffer = await file.arrayBuffer();
      documentContent = new TextDecoder('utf-8').decode(buffer);
    } else if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
      // Markdown文件
      const buffer = await file.arrayBuffer();
      documentContent = new TextDecoder('utf-8').decode(buffer);
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx')
    ) {
      // Word文档 - 使用mammoth库提取文本内容
      try {
        const buffer = await file.arrayBuffer();
        const nodeBuffer = Buffer.from(buffer);

        // 使用mammoth提取文本
        const result = await mammoth.extractRawText({ buffer: nodeBuffer });
        documentContent = result.value;

        // 检查是否有警告信息
        if (result.messages && result.messages.length > 0) {
          console.warn('[Parse Document] mammoth警告信息:', result.messages);
        }

        // 如果提取的文本为空，提示用户
        if (!documentContent || documentContent.trim().length === 0) {
          documentContent = `Word文档内容为空\n文件名：${file.name}\n大小：${file.size} bytes\n\n请检查文档是否包含文本内容。`;
        }
      } catch (error) {
        console.error('[Parse Document] Word文档解析失败:', error);
        documentContent = `Word文档解析失败\n文件名：${file.name}\n大小：${file.size} bytes\n\n错误：${error instanceof Error ? error.message : '未知错误'}\n\n建议：请确保文档格式正确，或尝试另存为TXT格式后重新上传。`;
      }
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式，请上传 TXT、Markdown 或 Word 文档' },
        { status: 400 }
      );
    }

    console.log('[Parse Document] 文档内容长度:', documentContent.length);

    // 文档内容优化：去重 + 智能裁剪
    documentContent = optimizeDocumentContent(documentContent);
    console.log('[Parse Document] 优化后文档长度:', documentContent.length);

    // 限制文档长度，避免AI返回被截断
    const MAX_LENGTH = 20000; // 限制为20000字符（约2万字），支持更长的文档
    if (documentContent.length > MAX_LENGTH) {
      console.warn('[Parse Document] 文档过长，智能裁剪到', MAX_LENGTH, '字符');
      documentContent = smartTruncate(documentContent, MAX_LENGTH) + '\n\n[注：文档过长，已智能裁剪。如需完整解析，请分批上传或手动添加]';
    }

    // 使用AI提取角色和世界观设定
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 获取自定义提示词（如果有的话）
    const promptTemplate = getPromptTemplate('document-parse');
    if (!promptTemplate) {
      throw new Error('未找到文档解析提示词模板');
    }

    const { systemPrompt, userPrompt } = renderPrompt(promptTemplate, {
      documentContent: documentContent,
    });

    console.log('[Parse Document] 使用提示词模板:', {
      templateName: promptTemplate.name,
      isCustom: promptTemplate.isCustom,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: userPrompt,
      },
    ];

    // 调用AI进行提取
    console.log('[Parse Document] 调用AI进行提取...');
    console.log('[Parse Document] 文档内容预览:', documentContent.substring(0, 200));

    try {
      response = await client.invoke(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.1, // 使用更低的温度以获得更准确、更简洁的结构化输出
      });
    } catch (aiError) {
      console.error('[Parse Document] AI调用失败:', aiError);
      throw new Error('AI服务调用失败，请稍后重试');
    }

    console.log('[Parse Document] AI提取结果长度:', response.content.length);
    console.log('[Parse Document] AI返回内容:', response.content);

    // 解析AI返回的JSON
    let extractedData: {
      characters: any[];
      worldSettings: any[];
    } = {
      characters: [],
      worldSettings: [],
    };

    // 先检查响应结构
    console.log('[Parse Document] 响应对象类型:', typeof response);
    console.log('[Parse Document] 响应对象keys:', response ? Object.keys(response) : 'response is null/undefined');

    // 获取响应内容
    let aiContent = '';
    if (typeof response === 'string') {
      aiContent = response;
    } else if (response && response.content) {
      aiContent = response.content;
    } else if (response && response.output && response.output.content) {
      aiContent = response.output.content;
    } else if (response && response.choices && response.choices[0] && response.choices[0].message) {
      aiContent = response.choices[0].message.content;
    } else {
      console.error('[Parse Document] 无法从响应中提取内容，响应结构:', JSON.stringify(response, null, 2));
      throw new Error('无法解析AI响应内容，响应格式不符合预期');
    }

    console.log('[Parse Document] 提取到的AI内容长度:', aiContent.length);
    console.log('[Parse Document] AI内容前500字符:', aiContent.substring(0, 500));

    try {
      // 尝试直接解析
      extractedData = JSON.parse(aiContent);
      console.log('[Parse Document] 直接JSON解析成功');
    } catch (error) {
      // 如果直接解析失败，尝试提取JSON部分
      console.log('[Parse Document] 直接JSON解析失败，尝试提取JSON部分');
      console.error('[Parse Document] JSON解析错误:', error);

      // 尝试多种方法提取JSON
      let jsonStr = aiContent;

      // 方法1: 查找JSON对象开始和结束位置（最可靠的方法）
      const startIndex = jsonStr.indexOf('{');
      if (startIndex !== -1) {
        let braceCount = 0;
        let endIndex = -1;

        for (let i = startIndex; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') braceCount++;
          if (jsonStr[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }

        if (endIndex !== -1) {
          jsonStr = jsonStr.substring(startIndex, endIndex);
          console.log('[Parse Document] 通过花括号匹配提取JSON，长度:', jsonStr.length);
        }
      }

      // 方法2: 如果方法1失败，尝试正则匹配
      if (jsonStr === aiContent) {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
          console.log('[Parse Document] 通过正则提取JSON，长度:', jsonStr.length);
        }
      }

      // 尝试修复常见的JSON格式问题
      try {
        extractedData = JSON.parse(jsonStr);
        console.log('[Parse Document] JSON提取成功');
      } catch (parseError) {
        console.error('[Parse Document] JSON解析失败，原始内容:', jsonStr.substring(0, 500));
        console.error('[Parse Document] 解析错误:', parseError);

        // 尝试修复常见的JSON问题
        try {
          // 移除可能的控制字符，但保留换行
          let fixedJson = jsonStr
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

          extractedData = JSON.parse(fixedJson);
          console.log('[Parse Document] 通过移除控制字符修复JSON成功');
        } catch (fixError) {
          console.error('[Parse Document] JSON修复失败:', fixError);

          // 最后尝试：去除所有换行和空格
          try {
            let compressedJson = jsonStr
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
              .replace(/\s+/g, '');

            extractedData = JSON.parse(compressedJson);
            console.log('[Parse Document] 通过压缩JSON修复成功');
          } catch (finalError) {
            console.error('[Parse Document] 所有JSON修复方法都失败，尝试修复被截断的JSON');

            // 尝试修复被截断的JSON - 改进的逻辑
            try {
              let fixedJson = jsonStr;

              // 尝试找到最后一个完整的对象
              const lastCompleteBrace = fixedJson.lastIndexOf('}');
              
              if (lastCompleteBrace !== -1) {
                // 从最后一个完整的对象开始截断
                let braceCount = 0;
                let lastValidIndex = -1;

                for (let i = lastCompleteBrace; i >= 0; i--) {
                  if (fixedJson[i] === '}') braceCount++;
                  if (fixedJson[i] === '{') braceCount--;
                  if (braceCount === 0) {
                    lastValidIndex = i;
                    break;
                  }
                }

                if (lastValidIndex !== -1) {
                  // 找到最后一个完整的对象
                  fixedJson = fixedJson.substring(0, lastCompleteBrace + 1);

                  // 检查是否在数组中
                  const isArray = fixedJson.trim().startsWith('[') || fixedJson.includes('"characters":[') || fixedJson.includes('"worldSettings":[');

                  if (isArray) {
                    // 在数组中，需要在对象后添加闭合括号
                    // 找到最后一个未闭合的数组
                    let openBrackets = 0;
                    let lastOpenBracket = -1;

                    for (let i = fixedJson.length - 1; i >= 0; i--) {
                      if (fixedJson[i] === '[') {
                        openBrackets++;
                        if (lastOpenBracket === -1) lastOpenBracket = i;
                      }
                      if (fixedJson[i] === ']') openBrackets--;
                    }

                    // 添加缺失的闭合括号
                    if (openBrackets > 0) {
                      for (let i = 0; i < openBrackets; i++) {
                        fixedJson += ']';
                      }
                    }

                    // 检查是否有未闭合的外层对象
                    let openBraces = 0;
                    for (let i = fixedJson.length - 1; i >= 0; i--) {
                      if (fixedJson[i] === '{') openBraces++;
                      if (fixedJson[i] === '}') openBraces--;
                    }

                    if (openBraces > 0) {
                      for (let i = 0; i < openBraces; i++) {
                        fixedJson += '}';
                      }
                    }
                  }

                  console.log('[Parse Document] 通过截断修复JSON成功，修复后长度:', fixedJson.length);
                  extractedData = JSON.parse(fixedJson);
                } else {
                  throw new Error('无法找到完整的对象');
                }
              } else {
                throw new Error('无法找到任何完整的对象');
              }
            } catch (truncateError) {
              console.error('[Parse Document] 截断修复失败:', truncateError);
              
              // 如果所有修复都失败，尝试至少提取部分数据
              console.log('[Parse Document] 尝试部分提取数据...');
              
              try {
                // 检查是否有 characters 字段，即使不完整也尝试提取
                if (aiContent.includes('"characters"') && aiContent.includes('[{')) {
                  const charStart = aiContent.indexOf('"characters"');
                  const charArrayStart = aiContent.indexOf('[', charStart);
                  
                  if (charArrayStart !== -1) {
                    // 手动提取尽可能多的角色
                    extractedData.characters = [];
                    let currentObj = '';
                    let braceCount = 0;
                    let inString = false;
                    let escapeNext = false;

                    for (let i = charArrayStart + 1; i < aiContent.length; i++) {
                      const char = aiContent[i];
                      
                      if (escapeNext) {
                        currentObj += char;
                        escapeNext = false;
                        continue;
                      }

                      if (char === '\\') {
                        currentObj += char;
                        escapeNext = true;
                        continue;
                      }

                      if (char === '"' && !escapeNext) {
                        inString = !inString;
                        currentObj += char;
                        continue;
                      }

                      if (!inString) {
                        if (char === '{') {
                          braceCount++;
                        } else if (char === '}') {
                          braceCount--;
                        } else if (char === ']' && braceCount === 0) {
                          break;
                        }
                      }

                      currentObj += char;

                      if (!inString && braceCount === 0 && currentObj.trim()) {
                        try {
                          const parsedChar = JSON.parse(currentObj.trim());
                          extractedData.characters.push(parsedChar);
                          currentObj = '';
                        } catch (e) {
                          // 跳过无法解析的对象
                          currentObj = '';
                        }
                      }
                    }
                    
                    console.log('[Parse Document] 部分提取成功，提取到', extractedData.characters.length, '个角色');
                  }
                }
              } catch (partialError) {
                console.error('[Parse Document] 部分提取失败:', partialError);
              }

              if (extractedData.characters.length === 0 && extractedData.worldSettings.length === 0) {
                console.error('[Parse Document] 所有修复方法都失败，AI完整响应:', aiContent);
                throw new Error(`AI返回的格式不正确，无法提取角色和世界观数据。错误详情：${finalError instanceof Error ? finalError.message : String(finalError)}\n\n可能原因：文档过长导致AI返回的JSON被截断。建议：1. 缩短文档内容；2. 分批上传；3. 手动添加设定。\n\nAI响应长度: ${aiContent.length} 字符\nAI响应预览：${aiContent.substring(0, 500)}`);
              }
            }
          }
        }
      }
    }

    console.log('[Parse Document] 提取结果:', {
      characterCount: extractedData.characters?.length || 0,
      worldSettingsCount: extractedData.worldSettings?.length || 0,
    });

    // 验证提取的数据格式
    if (!extractedData.characters) {
      console.warn('[Parse Document] characters字段缺失，初始化为空数组');
      extractedData.characters = [];
    }
    if (!extractedData.worldSettings) {
      console.warn('[Parse Document] worldSettings字段缺失，初始化为空数组');
      extractedData.worldSettings = [];
    }

    // 验证每个角色的格式
    extractedData.characters = (extractedData.characters || []).map((char: any) => ({
      name: char.name || '未知角色',
      age: char.age || undefined,
      appearance: char.appearance || '',
      personality: char.personality || '',
      background: char.background || '',
      role: char.role || 'minor',
    }));

    // 验证每个世界观设定的格式
    extractedData.worldSettings = (extractedData.worldSettings || []).map((setting: any) => ({
      category: setting.category || '其他',
      title: setting.title || setting.content?.substring(0, 20) || '未命名设定',
      content: setting.content || '',
    }));

    // 返回解析结果
    return NextResponse.json({
      success: true,
      data: {
        characters: extractedData.characters || [],
        worldSettings: extractedData.worldSettings || [],
        documentPreview: documentContent.length > 500
          ? documentContent.substring(0, 500) + '...'
          : documentContent, // 文档内容预览
        aiResponse: aiContent, // 完整的AI响应用于调试
      },
    });
  } catch (error: any) {
    console.error('[Parse Document] 解析失败:', error);

    // 返回详细的错误信息，包含AI原始响应用于调试
    return NextResponse.json(
      {
        success: false,
        error: error.message || '文档解析失败',
        debugInfo: {
          documentPreview: documentContent?.substring(0, 500) + '...',
          documentLength: documentContent?.length || 0,
          aiResponse: aiContent || response?.content || '', // 优先使用aiContent
          errorDetails: error.stack || '',
        },
      },
      { status: 500 }
    );
  }
}
