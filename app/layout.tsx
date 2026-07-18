import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import localFont from 'next/font/local'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/navigation/site-header'
import { siteConfig } from '@/lib/site-config'

import './globals.css'

const displaySerif = localFont({
  src: './fonts/NotoSerifSC-VF.subset.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '200 900'
})

export const viewport: Viewport = {
  themeColor: '#f6f1e7'
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | 从 0 学 AI Agent 工程`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'zh_CN',
    type: 'website'
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={displaySerif.variable}>
        <a className="skip-link" href="#main-content">跳到正文</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
