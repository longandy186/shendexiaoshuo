import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建 FetchClient
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    // 获取 URL 内容
    const response = await client.fetch(url);

    // 检查响应状态
    if (response.status_code !== 0) {
      return NextResponse.json(
        {
          error: 'Failed to fetch URL',
          message: response.status_message,
        },
        { status: 500 }
      );
    }

    // 提取文本内容
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    // 提取图片
    const images = response.content
      .filter(item => item.type === 'image')
      .map(item => ({
        url: item.image?.display_url,
        width: item.image?.width,
        height: item.image?.height,
        thumbnail: item.image?.thumbnail_display_url,
      }));

    // 提取链接
    const links = response.content
      .filter(item => item.type === 'link')
      .map(item => item.url);

    return NextResponse.json({
      title: response.title,
      url: response.url,
      content: textContent,
      images,
      links,
      filetype: response.filetype,
      publishTime: response.publish_time,
    });
  } catch (error: any) {
    console.error('Error fetching URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch URL',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
