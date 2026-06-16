import { useState, useRef, useCallback, useEffect } from 'react'
import LoadingSpinner from '../Common/LoadingSpinner'
import { useSpeech } from '../../hooks/useSpeech'
import { useUser } from '../../context/UserContext'
import { getTeamMembers } from '../../services/userService'
import styles from './ChatInput.module.css'

const WAVE_BARS = [
  { h: 10, dur: 0.80, delay: 0.00 },
  { h: 20, dur: 0.60, delay: 0.10 },
  { h: 30, dur: 0.70, delay: 0.20 },
  { h: 38, dur: 0.55, delay: 0.05 },
  { h: 44, dur: 0.65, delay: 0.15 },
  { h: 38, dur: 0.50, delay: 0.25 },
  { h: 30, dur: 0.75, delay: 0.08 },
  { h: 20, dur: 0.60, delay: 0.18 },
  { h: 10, dur: 0.80, delay: 0.00 },
]

function SoundWave() {
  return (
    <div className={styles.soundWave} aria-hidden="true">
      {WAVE_BARS.map((b, i) => (
        <span
          key={i}
          className={styles.waveBar}
          style={{
            '--bar-max': `${b.h}px`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
      <span className={styles.waveLabel}>Listening…</span>
    </div>
  )
}

export default function ChatInput({ onSend, disabled }) {
  const { teamId, userId } = useUser()
  const [value, setValue]     = useState('')
  const [interim, setInterim] = useState('')
  const textareaRef = useRef(null)

  // @mention state
  const [mentionOpen, setMentionOpen]   = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [allMembers, setAllMembers]     = useState([])
  const [mentionIdx, setMentionIdx]     = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const membersLoadedRef = useRef(false)

  // Derived: filter members by current query, exclude self, limit to 6
  const filtered = (mentionQuery
    ? allMembers.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : allMembers
  ).slice(0, 6)

  const handleFinal = useCallback((transcript) => {
    setInterim('')
    setValue(prev => (prev.trim() ? prev.trim() + ' ' : '') + transcript)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const handleInterim = useCallback((t) => setInterim(t), [])

  const { listening, supported, toggle } = useSpeech({
    onFinal:   handleFinal,
    onInterim: handleInterim,
  })

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    setInterim('')
    setMentionOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const selectMention = (member) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const firstName = member.name.split(' ')[0]
    const insert = '@' + firstName + ' '
    const newVal = value.slice(0, mentionStart) + insert + value.slice(cursor)
    setValue(newVal)
    setMentionOpen(false)
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        const pos = mentionStart + insert.length
        ta.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (mentionOpen && filtered.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIdx(i => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIdx(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Escape') {
        setMentionOpen(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectMention(filtered[mentionIdx])
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const handleInput = (e) => {
    const val = e.target.value
    setValue(val)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px' }

    // @mention detection: look back from cursor for an @ not preceded by a word char
    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const match = before.match(/(?:^|[\s,])(@\w*)$/)
    if (match) {
      const full = match[1]           // e.g. "@al"
      const query = full.slice(1)     // e.g. "al"
      const atPos = cursor - full.length
      setMentionQuery(query)
      setMentionStart(atPos)
      setMentionIdx(0)
      setMentionOpen(true)
      if (!membersLoadedRef.current && teamId) {
        membersLoadedRef.current = true
        getTeamMembers(teamId)
          .then(data => {
            const list = (Array.isArray(data) ? data : [])
              .filter(m => m.is_active && m.user_id !== userId)
            setAllMembers(list)
          })
          .catch(() => {})
      }
    } else {
      setMentionOpen(false)
    }
  }

  const displayValue = listening && interim ? value + interim : value
  const showWave = listening && !displayValue

  return (
    <div className={styles.container}>
      {/* @mention picker — floats above the input row */}
      {mentionOpen && filtered.length > 0 && (
        <div className={styles.mentionPicker}>
          {filtered.map((m, i) => (
            <button
              key={m.user_id}
              type="button"
              className={`${styles.mentionItem} ${i === mentionIdx ? styles.mentionItemActive : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectMention(m) }}
              onMouseEnter={() => setMentionIdx(i)}
            >
              <span className={styles.mentionAvatar}>{m.name[0].toUpperCase()}</span>
              <span className={styles.mentionName}>{m.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className={`${styles.inputRow} ${disabled ? styles.disabled : ''} ${listening ? styles.recording : ''}`}>
        {supported && (
          <button
            type="button"
            className={`${styles.micBtn} ${listening ? styles.micActive : ''}`}
            onClick={toggle}
            disabled={disabled}
            aria-label={listening ? 'Stop recording' : 'Start voice input'}
            title={listening ? 'Click to stop' : 'Click to speak'}
          >
            {listening ? <StopIcon /> : <MicIcon />}
            {listening && <span className={styles.ripple} />}
          </button>
        )}

        {showWave && <SoundWave />}

        <textarea
          ref={textareaRef}
          className={`${styles.textarea} ${showWave ? styles.waveHidden : ''} ${listening && interim ? styles.interim : ''}`}
          placeholder="Ask your assistant anything…"
          value={displayValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />

        <button
          className={styles.sendBtn}
          onClick={submit}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
        >
          {disabled ? <LoadingSpinner size={18} color="#1A1B0D" /> : <SendIcon />}
        </button>
      </div>

      <p className={styles.hint}>
        {listening
          ? '🔴 Recording — speak clearly, pause to stop'
          : 'Enter to send · Shift+Enter for new line · @ to mention · 🎤 voice'}
      </p>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8"  y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
