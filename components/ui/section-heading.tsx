import type { ReactNode } from 'react'

type SectionHeadingProps = {
  index?: string
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeading({ index, title, description, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div className="section-heading__title">
        {index ? <span>{index}</span> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
