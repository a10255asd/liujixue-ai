import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-shell not-found">
      <span>404 / NOT FOUND</span>
      <h1>这页还没有进入知识地图。</h1>
      <p>可能是链接已经调整，也可能是内容仍在整理。先回到学习路线继续。</p>
      <Link className="button button--primary" href="/roadmap"><ArrowLeft size={17} /> 返回学习路线</Link>
    </div>
  )
}
