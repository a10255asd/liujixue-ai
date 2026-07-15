import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { siteConfig } from '@/lib/site-config'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__mark">J / AI</p>
          <p className="site-footer__note">把学习过程沉淀成能复用、能展示、能面试的工程资产。</p>
        </div>
        <nav className="site-footer__nav" aria-label="页脚导航">
          <Link href="/roadmap">学习路线</Link>
          <Link href="/career">求职路径</Link>
          <Link href="/interview">面试题库</Link>
          <Link href="/projects">项目实战</Link>
          <a href={siteConfig.mainSiteUrl} target="_blank" rel="noreferrer">
            liujixue.cn <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </footer>
  )
}
