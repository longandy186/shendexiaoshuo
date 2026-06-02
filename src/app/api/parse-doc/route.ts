import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const docxUrl = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F%E7%82%BC%E5%AD%97%E5%B7%A5%E5%9D%8AAI%E5%88%9B%E4%BD%9C%E5%B9%B3%E5%8F%B0+%E5%A4%8D%E5%88%BB%E7%89%88%EF%BC%88%E6%89%A3%E5%AD%90%E7%BC%96%E7%A8%8B%E7%89%88%EF%BC%89%E6%8A%80%E6%9C%AF%E5%BC%80%E5%8F%91%E6%96%87%E6%A1%A3.docx&nonce=379b0971-3702-427e-8317-affeef6fbcc0&project_id=7614824638762893331&sign=f3134985be2665fa86b256258b8d6ead52b4f587d993f6349a2cae392a1b7193';

    const response = await client.fetch(docxUrl);

    const textContent = response.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');

    return NextResponse.json({
      success: true,
      title: response.title,
      content: textContent,
      url: response.url,
      filetype: response.filetype,
    });
  } catch (error) {
    console.error('Failed to fetch document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
