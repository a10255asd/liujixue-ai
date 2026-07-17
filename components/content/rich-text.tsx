type RichTextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; text: string }

function cleanInline(text: string): string {
  return text.replace(/\*\*/g, '').replace(/`/g, '').trim()
}

function parseRichText(content: string): RichTextBlock[] {
  const blocks: RichTextBlock[] = []
  const paragraph: string[] = []
  const code: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let inCode = false

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: cleanInline(paragraph.join(' ')) })
    paragraph.length = 0
  }

  function flushList() {
    if (!listType || !listItems.length) return
    blocks.push({ type: listType, items: listItems.map(cleanInline).filter(Boolean) })
    listType = null
    listItems = []
  }

  function flushCode() {
    if (!code.length) return
    blocks.push({ type: 'code', text: code.join('\n').trimEnd() })
    code.length = 0
  }

  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      if (inCode) {
        inCode = false
        flushCode()
      } else {
        flushParagraph()
        flushList()
        inCode = true
      }
      continue
    }

    if (inCode) {
      code.push(rawLine)
      continue
    }

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^#{2,4}\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', text: cleanInline(heading[1]) })
      continue
    }

    const unordered = line.match(/^[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unordered[1])
      continue
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(ordered[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushCode()
  flushParagraph()
  flushList()

  return blocks
}

export function RichText({ content, className = '' }: { content: string; className?: string }) {
  const blocks = parseRichText(content)
  const rootClassName = ['rich-text', className].filter(Boolean).join(' ')

  return (
    <div className={rootClassName}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') return <h3 key={`${block.type}-${index}`}>{block.text}</h3>
        if (block.type === 'paragraph') return <p key={`${block.type}-${index}`}>{block.text}</p>
        if (block.type === 'code') return <pre key={`${block.type}-${index}`}><code>{block.text}</code></pre>
        const ListTag = block.type
        return (
          <ListTag key={`${block.type}-${index}`}>
            {block.items.map((item) => <li key={item}>{item}</li>)}
          </ListTag>
        )
      })}
    </div>
  )
}
