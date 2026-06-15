// Assistant page — the main AI chat interface.
// Chat history is persisted per-user in localStorage so it survives page refresh.
// A proactive polling loop runs every 2 s to pull background server events
// (task completions, update requests, etc.) and inject them as UPDATE-badged bubbles.
// After every user message, pa:refresh-schedule is dispatched so the Dashboard,
// Calendar and Tasks pages reflect any mutations made by the assistant.

import { useState, useEffect, useRef, useContext } from 'react'
import { sendMessage } from '../../services/assistantService'
import ChatMessage from '../../components/Chat/ChatMessage'
import ChatInput from '../../components/Chat/ChatInput'
import TypingIndicator from '../../components/Chat/TypingIndicator'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useUser } from '../../context/UserContext'
import { ToastContext } from '../../context/ToastContext'
import styles from './Assistant.module.css'

function AlumnxSvg({ size = 22 }) {
  const h = Math.round(size * 1.1)
  return (
    <svg width={size} height={h} viewBox="0 0 28 31" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="14,1 1,26 27,26" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="6.5" y1="20" x2="21.5" y2="20" stroke="white" strokeWidth="1.8"/>
      <circle cx="14" cy="17" r="3.8" fill="#F97316"/>
      <line x1="7"    y1="26" x2="5"    y2="31" stroke="white" strokeWidth="1.3"/>
      <line x1="10.5" y1="26" x2="9.5"  y2="31" stroke="white" strokeWidth="1.3"/>
      <line x1="14"   y1="26" x2="14"   y2="31" stroke="white" strokeWidth="1.3"/>
      <line x1="17.5" y1="26" x2="18.5" y2="31" stroke="white" strokeWidth="1.3"/>
      <line x1="21"   y1="26" x2="23"   y2="31" stroke="white" strokeWidth="1.3"/>
    </svg>
  )
}

// Static welcome message — injected as default so first-load always shows something
const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm PA, your Personal Assistant. I can help you schedule meetings, create tasks, check your schedule, and manage your day. What can I do for you?",
  timestamp: new Date().toISOString(),
  intent: 'greeting',
}

// Intents that require a schedule refresh after response
const SCHEDULE_INTENTS = new Set([
  'create_task', 'create_meeting', 'update_task', 'update_meeting', 'complete_task',
])

// Intents that also require a context (AI memory) refresh
const CONTEXT_INTENTS = new Set(['complete_task'])

export default function Assistant() {
  const { userId, backendOnline } = useUser()
  const [messages, setMessages] = useLocalStorage(`pa_messages_${userId}`, [WELCOME])
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)
  const { addToast }            = useContext(ToastContext)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Delete session event from Sidebar
  useEffect(() => {
    const handler = () => {
      setMessages([{ ...WELCOME, timestamp: new Date().toISOString() }])
    }
    window.addEventListener('pa:delete-session', handler)
    return () => window.removeEventListener('pa:delete-session', handler)
  }, [setMessages])

  // Listen for proactive messages dispatched by the global Layout poller.
  // Layout handles the actual API polling so it works on all pages.
  useEffect(() => {
    const handler = (e) => {
      const injected = e.detail.map(text => ({
        id:        crypto.randomUUID(),
        role:      'assistant',
        text,
        timestamp: new Date().toISOString(),
        proactive: true,
      }))
      setMessages(prev => [...prev, ...injected])
    }
    window.addEventListener('pa:proactive-messages', handler)
    return () => window.removeEventListener('pa:proactive-messages', handler)
  }, [setMessages])


  const handleSend = async (text) => {
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const data = await sendMessage(text, userId)

      // Non-null error field — backend understood the intent but action failed
      if (data.error) {
        const friendly = data.error.includes('item not found')
          ? "Couldn't find that item. Try being more specific."
          : 'Something went wrong. Please try again.'
        addToast(friendly, 'error')
      }

      const assistantMsg = {
        id:        crypto.randomUUID(),
        role:      'assistant',
        text:      data.response ?? data.error ?? 'No response received.',
        intent:    data.intent,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Always refresh schedule — backend intent is always null so the
      // old intent-check never fired. Dashboard listens for this event.
      window.dispatchEvent(new CustomEvent('pa:refresh-schedule'))
    } catch (err) {
      addToast(err.message || 'Failed to reach assistant', 'error')
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: "Sorry, I couldn't reach the server. Please make sure the backend is running.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = backendOnline === null
    ? 'Connecting…'
    : backendOnline
    ? 'Online · Ready to help'
    : 'Backend offline'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <AlumnxSvg size={22} />
          <div className={styles.headerTitles}>
            <div className={styles.brandRow}>
              <span className={styles.brandLabel}>ALUMNX</span>
              <span className={styles.aiLabel}>AI LABS</span>
            </div>
            <span className={styles.headerSub}>Personal Assistant</span>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${backendOnline === false ? styles.statusOffline : backendOnline === null ? styles.statusChecking : styles.statusOnline}`}>
          {backendOnline === false ? 'Offline' : backendOnline === null ? 'Connecting…' : 'Online'}
        </span>
      </div>

      <div className={styles.messages}>
        <div className={styles.spacer} />
        {(() => {
          const lastAssistantIndex = messages.reduce(
            (acc, msg, idx) => msg.role === 'assistant' ? idx : acc, -1
          )
          return messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={index === lastAssistantIndex}
              onSendOption={index === lastAssistantIndex ? handleSend : undefined}
              loading={loading}
            />
          ))
        })()}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
