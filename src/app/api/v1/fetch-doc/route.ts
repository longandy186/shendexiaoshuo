import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { code: 400, msg: 'URL is required', data: null },
        { status: 400 }
      );
    }

    // Extract headers from incoming request
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // Initialize FetchClient with config and headers
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    // Fetch the document content
    const response = await client.fetch(url);

    // Check if fetch was successful
    if (response.status_code !== undefined && response.status_code !== 0) {
      return NextResponse.json(
        {
          code: response.status_code,
          msg: response.status_message || 'Failed to fetch document',
          data: null,
        },
        { status: 500 }
      );
    }

    // Extract text content
    const textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');

    return NextResponse.json({
      code: 0,
      msg: 'success',
      data: {
        title: response.title,
        url: response.url,
        filetype: response.filetype,
        content: textContent,
        displayInfo: response.display_info,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      {
        code: 500,
        msg: error instanceof Error ? error.message : 'Internal server error',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
