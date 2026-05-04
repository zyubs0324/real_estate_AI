import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '부동산 AI 어시스턴트',
  description: '공인중개사를 위한 AI 기반 부동산 업무 도구',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
        {children}
      </body>
    </html>
  )
}
