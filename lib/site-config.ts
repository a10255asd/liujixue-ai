export const siteConfig = {
  name: '刘鸡血 AI 学习库',
  shortName: 'Jixue AI Lab',
  description: '面向开发者的 AI Agent 学习路线、面试题库和项目实战知识库。',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai.liujixue.cn',
  mainSiteUrl: 'https://liujixue.cn',
  blogUrl: 'https://blog.liujixue.cn',
  navigation: [
    { href: '/roadmap', label: '路线' },
    { href: '/knowledge', label: '知识库' },
    { href: '/agent', label: 'Agent' },
    { href: '/interview', label: '面试题' },
    { href: '/projects', label: '项目' },
    { href: '/resources', label: '资料' },
    { href: '/journal', label: '日志' }
  ]
} as const
