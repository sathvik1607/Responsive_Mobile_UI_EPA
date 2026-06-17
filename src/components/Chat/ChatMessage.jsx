// ChatMessage — renders a single message bubble for both user and assistant roles.
// Assistant messages support markdown (bold, italic, code, lists, code blocks).
// When the last assistant message contains a numbered list, the items are extracted
// and rendered as quick-reply chips outside the bubble (suppressNumbered hides the
// original list inside the bubble to avoid showing it twice).

import { useState } from 'react'
import styles from './ChatMessage.module.css'

const INTENT_LABELS = {
  schedule:   'Schedule',
  cancel:     'Cancel',
  update:     'Update',
  query:      'Query',
  free_slots: 'Free Slots',
  chat:       'Chat',
  greeting:   'Greeting',
}

// Pulls option text out of lines like "1. Keep both" or "2. Reschedule"
function extractNumberedItems(text) {
  if (!text) return []
  const items = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\d+\.\s+(.+)/)
    if (m) items.push(m[1].trim())
  }
  return items
}

export default function ChatMessage({ message, isLast, onSendOption, loading }) {
  const isUser = message.role === 'user'
  const time   = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })

  // Compute quick reply options — only for last assistant message with numbered list
  const displayOptions = (!isUser && isLast && onSendOption)
    ? extractNumberedItems(message.text).slice(0, 6)
    : []

  const suppressNumbered = displayOptions.length > 0

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <div className={styles.avatar}>P</div>}

      <div className={styles.content}>
        <div className={styles.bubble}>
          <MessageText text={message.text} isUser={isUser} suppressNumbered={suppressNumbered} />
        </div>

        {/* Quick reply chips — display label, send ordinal "1"/"2"/"3" */}
        {displayOptions.length > 0 && (
          <div className={styles.chipsScroll}>
            {displayOptions.map((label, i) => (
              <button
                key={i}
                className={styles.chipBtn}
                disabled={loading}
                onClick={() => !loading && onSendOption(String(i + 1))}
                title={`Send: ${i + 1}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.meta}>
          {!isUser && message.proactive && (
            <span className={styles.proactiveBadge}>UPDATE</span>
          )}
          {!isUser && !message.proactive && message.intent && message.intent !== 'chat' && (
            <span className={styles.intent}>
              {INTENT_LABELS[message.intent] || message.intent}
            </span>
          )}
          <span className={styles.time}>{time}</span>
          {!isUser && message.metrics && (
            <MetricsChip metrics={message.metrics} />
          )}
        </div>
      </div>

      {isUser && <div className={styles.avatarUser}>U</div>}
    </div>
  )
}

// ── Text renderer ─────────────────────────────────────────────────────────────

function MessageText({ text, isUser, suppressNumbered }) {
  if (!text) return null

  if (isUser) {
    return <p className={styles.text}><LinkifyText text={text} /></p>
  }

  // Split on fenced code blocks first (```lang\n...\n```)
  const CODE_BLOCK = /```(\w*)\n?([\s\S]*?)```/g
  const segments = []
  let last = 0
  let match

  while ((match = CODE_BLOCK.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'prose', content: text.slice(last, match.index) })
    }
    segments.push({ type: 'code', lang: match[1] || '', content: match[2] })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    segments.push({ type: 'prose', content: text.slice(last) })
  }

  return (
    <div className={styles.text}>
      {segments.map((seg, i) =>
        seg.type === 'code'
          ? <CodeBlock key={i} lang={seg.lang} code={seg.content} />
          : <ProseBlock key={i} text={seg.content} suppressNumbered={suppressNumbered} />
      )}
    </div>
  )
}

function CodeBlock({ lang, code }) {
  return (
    <div className={styles.codeBlock}>
      {lang && <span className={styles.codeBlockLang}>{lang}</span>}
      <code className={styles.codeBlockContent}>{code.trimEnd()}</code>
    </div>
  )
}

function ProseBlock({ text, suppressNumbered }) {
  const lines = text.split('\n')
  const output = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Bullet list item
    if (/^[-*•]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ''))
        i++
      }
      output.push(
        <ul key={i} className={styles.textList}>
          {items.map((it, j) => <li key={j}><InlineText text={it} /></li>)}
        </ul>
      )
      continue
    }

    // Numbered list item
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      if (suppressNumbered) {
        // Chips are rendered outside the bubble — skip to prevent duplication
        continue
      }
      output.push(
        <ol key={i} className={styles.textList}>
          {items.map((it, j) => <li key={j}><InlineText text={it} /></li>)}
        </ol>
      )
      continue
    }

    // Blank line → paragraph break (skip)
    if (line.trim() === '') {
      i++
      continue
    }

    // Normal line
    output.push(
      <p key={i}><InlineText text={line} /></p>
    )
    i++
  }

  return <>{output}</>
}

// Inline: **bold**, *italic*, `code`, and bare URLs
function InlineText({ text }) {
  const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s<>"'\]]+)/g
  const parts = text.split(INLINE)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i}>{part.slice(1, -1)}</code>
        if (/^https?:\/\//.test(part))
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={styles.chatLink}>{part}</a>
        return part
      })}
    </>
  )
}

// URL-only linkifier for user messages (no markdown processing)
function LinkifyText({ text }) {
  const parts = text.split(/(https?:\/\/[^\s<>"'\]]+)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={styles.chatLink}>{part}</a>
          : part
      )}
    </>
  )
}

// ── Metrics chip ──────────────────────────────────────────────────────────────

function MetricsChip({ metrics }) {
  const [open, setOpen] = useState(false)

  const costLabel = metrics.total_cost_usd < 0.0001
    ? '<$0.0001'
    : `$${metrics.total_cost_usd.toFixed(4)}`

  return (
    <span className={styles.metricsWrap}>
      <button
        className={styles.metricsBtn}
        onClick={() => setOpen((o) => !o)}
        title="Show token / cost details"
      >
        ⚡ {metrics.total_tokens} tok · {metrics.latency_seconds.toFixed(2)}s
      </button>

      {open && (
        <span className={styles.metricsPopup}>
          <span>In: {metrics.input_tokens}</span>
          <span>Out: {metrics.output_tokens}</span>
          <span>Cost: {costLabel}</span>
          <span>{metrics.tokens_per_second} tok/s</span>
        </span>
      )}
    </span>
  )
}
