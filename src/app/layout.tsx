import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '神的小说工坊',
    template: '%s | 神的小说工坊',
  },
  description:
    '神的小说工坊 - 面向小团队的AI智能创作一站式平台，提供从灵感捕捉到成稿输出的全流程AI辅助。',
  keywords: [
    '神的小说工坊',
    'AI创作',
    '小说创作',
    '网文助手',
    '智能写作',
    'AI写作工具',
    '小说生成',
    '内容创作',
    '写作辅助',
  ],
  authors: [{ name: '神的作品', url: 'https://code.coze.cn' }],
  generator: '神的小说工坊',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: '神的小说工坊 | AI智能创作平台',
    description:
      '神的小说工坊 - 面向小团队的AI智能创作一站式平台，提供从灵感捕捉到成稿输出的全流程AI辅助。',
    url: 'https://code.coze.cn',
    siteName: '神的小说工坊',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: '神的小说工坊 - AI智能创作平台',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
