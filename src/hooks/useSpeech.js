import { useState, useEffect, useRef, useCallback } from 'react'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * useSpeech — wraps Web Speech API for mic-to-text input.
 *
 * @param {Function} onFinal   — called with final transcript string
 * @param {Function} onInterim — called with interim (partial) transcript string
 *
 * Returns: { listening, supported, start, stop, toggle }
 */
export function useSpeech({ onFinal, onInterim } = {}) {
  const [listening, setListening]   = useState(false)
  const [supported, setSupported]   = useState(!!SR)
  const recRef    = useRef(null)
  const finalRef  = useRef(onFinal)
  const interimRef = useRef(onInterim)

  // Keep callback refs current without re-creating the recognizer
  useEffect(() => { finalRef.current   = onFinal  }, [onFinal])
  useEffect(() => { interimRef.current = onInterim }, [onInterim])

  useEffect(() => {
    if (!SR) { setSupported(false); return }

    const rec = new SR()
    rec.continuous      = false        // stop after natural pause
    rec.interimResults  = true         // show live transcript
    rec.lang            = navigator.language || 'en-US'
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)

    rec.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final   += t
        else                       interim += t
      }
      if (interim) interimRef.current?.(interim)
      if (final)   finalRef.current?.(final)
    }

    rec.onerror = (e) => {
      // 'no-speech' is normal — user just didn't say anything
      if (e.error !== 'no-speech') {
        console.warn('[useSpeech] error:', e.error)
      }
      setListening(false)
    }

    rec.onend = () => setListening(false)

    recRef.current = rec
    return () => { try { rec.abort() } catch {} }
  }, [])

  const start = useCallback(() => {
    if (!recRef.current || listening) return
    try { recRef.current.start() } catch {}
  }, [listening])

  const stop = useCallback(() => {
    if (!recRef.current || !listening) return
    try { recRef.current.stop() } catch {}
  }, [listening])

  const toggle = useCallback(() => {
    listening ? stop() : start()
  }, [listening, start, stop])

  return { listening, supported, start, stop, toggle }
}
