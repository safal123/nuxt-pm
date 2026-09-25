export type InlineToken = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export type MarkdownBlock =
  | { type: 'heading'; inline: InlineToken[] }
  | { type: 'paragraph'; inline: InlineToken[] }
  | { type: 'list'; ordered: boolean; items: InlineToken[][] }

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g

export const parseInline = (text: string): InlineToken[] =>
  text
    .split(INLINE)
    .filter(Boolean)
    .map((part) => {
      if (/^(\*\*|__).+\1$/.test(part)) return { text: part.slice(2, -2), bold: true }
      if (/^`.+`$/.test(part)) return { text: part.slice(1, -1), code: true }
      if (/^(\*|_).+\1$/.test(part)) return { text: part.slice(1, -1), italic: true }
      return { text: part }
    })

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

/** Small markdown subset for AI replies: headings, lists, paragraphs, bold/italic/code. */
export const parseChatMarkdown = (source: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join(' ')) })
    paragraph = []
  }

  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const heading = line.match(HEADING)
    const bullet = line.match(BULLET)
    const numbered = line.match(NUMBERED)

    if (!line.trim()) {
      flushParagraph()
      continue
    }
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'heading', inline: parseInline(heading[1]) })
      continue
    }
    if (bullet || numbered) {
      flushParagraph()
      const ordered = !!numbered
      const content = parseInline((bullet ?? numbered)![1])
      const last = blocks.at(-1)
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(content)
      else blocks.push({ type: 'list', ordered, items: [content] })
      continue
    }
    paragraph.push(line.trim())
  }

  flushParagraph()
  return blocks
}
