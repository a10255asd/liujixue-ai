'use client'

import { ArrowUpRight, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="返回 AI 学习库首页">
          <Image className="brand__avatar" src="/images/avatar.jpg" width={38} height={38} alt="刘鸡血头像" priority />
          <span className="brand__copy">
            <strong>Jixue AI</strong>
            <small>Learning system</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          {siteConfig.navigation.map((item) => (
            <Link
              className={cn('nav-link', pathname === item.href && 'nav-link--active')}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-portals">
          <a href={siteConfig.mainSiteUrl} target="_blank" rel="noreferrer">
            主站 <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <a href={siteConfig.blogUrl} target="_blank" rel="noreferrer">
            博客 <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label={open ? '关闭导航' : '打开导航'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav className="mobile-nav" aria-label="移动端导航">
          <div className="mobile-nav__grid">
            {siteConfig.navigation.map((item) => (
              <Link
                className={cn('mobile-nav__link', pathname === item.href && 'mobile-nav__link--active')}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mobile-nav__portals">
            <a href={siteConfig.mainSiteUrl} target="_blank" rel="noreferrer">个人主站</a>
            <a href={siteConfig.blogUrl} target="_blank" rel="noreferrer">开发博客</a>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
