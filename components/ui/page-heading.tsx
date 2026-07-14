import type { ReactNode } from 'react'

type PageHeadingProps = {
  eyebrow: string
  title: string
  description: string
  aside?: ReactNode
}

export function PageHeading({ eyebrow, title, description, aside }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <div className="page-heading__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside ? <div className="page-heading__aside">{aside}</div> : null}
    </header>
  )
}
