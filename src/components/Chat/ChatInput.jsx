import { useState, useRef, useCallback } from 'react'
import LoadingSpinner from '../Common/LoadingSpinner'
import { useSpeech } from '../../hooks/useSpeech'
import styles from './ChatInput.module.css'

// Bar definitions for the sound-wave animation shown while the mic is listening.
// Each bar has a max height (px), animation duration (s), and stagger delay (s)
// to create a natural-looking wave effect.
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
  const [value, setValue]     = useState('')
  const [interim, setInterim] = useState('')
  const textareaRef = useRef(null)

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
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const handleInput = (e) => {
    setValue(e.target.value)
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px' }
  }

  const displayValue = listening && interim ? value + interim : value
  // Show wave bars when mic is active and user hasn't started typing interim text
  const showWave = listening && !displayValue

  return (
    <div className={styles.container}>
      <div className={`${styles.inputRow} ${disabled ? styles.disabled : ''} ${listening ? styles.recording : ''}`}>

        {/* Mic / stop button */}
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

        {/* Sound wave (listening, no text yet) */}
        {showWave && <SoundWave />}

        {/* Textarea — hidden behind wave when wave is showing */}
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
          : 'Enter to send · Shift+Enter for new line · 🎤 mic for voice'}
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
