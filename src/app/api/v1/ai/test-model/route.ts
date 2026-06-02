import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId = 'doubao-seed-1-8-251228' } = body;

    console.log('[Test Model] 测试模型:', modelId);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: '你是一个AI助手。' },
      { role: 'user', content: '请说一句话证明你存在。' }
    ];

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Kimi K2.5 需要特定的 temperature 参数
          const llmConfig: any = {
            model: modelId,
            temperature: 0.7
          };

          // Kimi K2.5 模型限制：temperature 必须是 0.6 或 1.0
          if (modelId === 'kimi-k2-5-260127') {
            llmConfig.temperature = 0.6; // 使用非思考模式的默认值
          }

          const stream = client.stream(messages, llmConfig);

          let fullContent = '';
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
            }
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            success: true,
            model: modelId,
            content: fullContent
          })));
          controller.close();
        } catch (error: any) {
          console.error('[Test Model] 错误:', error);
          controller.enqueue(encoder.encode(JSON.stringify({
            success: false,
            model: modelId,
            error: error.message
          })));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
