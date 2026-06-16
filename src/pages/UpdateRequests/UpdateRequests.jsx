import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../../context/UserContext'
import {
  sendUpdateRequest, getSentRequests, getReceivedRequests,
  respondToRequest, cancelUpdateRequest,
} from '../../services/updateRequestService'
import { getTeamMembers } from '../../services/userService'
import { parseServerDate } from '../../utils/parseServerDate'
import styles from './UpdateRequests.module.css'

function fmtDate(str) {
  if (!str) return ''
  return parseServerDate(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',   cls: styles.badgePending },
    responded: { label: 'Responded', cls: styles.badgeResponded },
    cancelled: { label: 'Cancelled', cls: styles.badgeCancelled },
  }
  const { label, cls } = map[status] || { label: status, cls: '' }
  return <span className={`${styles.badge} ${cls}`}>{label}</span>
}

export default function UpdateRequests() {
  const { userId, teamId } = useUser()
  const [members, setMembers]     = useState([])
  const [memberMap, setMemberMap] = useState({})

  useEffect(() => {
    if (!teamId) return
    getTeamMembers(teamId).then(list => {
      setMembers(list)
      const m = {}
      list.forEach(x => { m[x.user_id] = x.name })
      setMemberMap(m)
    }).catch(() => {})
  }, [teamId])

  // All members can send and receive requests — no role check
  return (
    <AllMembersView
      userId={userId}
      teamId={teamId}
      members={members}
      memberMap={memberMap}
    />
  )
}

function AllMembersView({ userId, teamId, members, memberMap }) {
  // ── Sent (compose + list) ─────────────────────────────────────────────────
  const [sentRequests, setSentRequests]   = useState([])
  const [sentLoading, setSentLoading]     = useState(true)
  const [expandedId, setExpandedId]       = useState(null)

  const [toUserId, setToUserId]           = useState('')
  const [subject, setSubject]             = useState('')
  const [body, setBody]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [sendError, setSendError]         = useState('')
  const [sendSuccess, setSendSuccess]     = useState('')

  // ── Received (inbox + history) ────────────────────────────────────────────
  const [requests, setRequests]           = useState([])
  const [recvLoading, setRecvLoading]     = useState(true)
  const [respondingId, setRespondingId]   = useState(null)
  const [responseText, setResponseText]   = useState('')
  const [responding, setResponding]       = useState(false)
  const [respondError, setRespondError]   = useState('')

  const fetchSent = useCallback(() => {
    getSentRequests(userId)
      .then(setSentRequests)
      .catch(() => {})
      .finally(() => setSentLoading(false))
  }, [userId])

  const fetchReceived = useCallback(() => {
    getReceivedRequests(userId)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setRecvLoading(false))
  }, [userId])

  useEffect(() => { fetchSent() }, [fetchSent])
  useEffect(() => { fetchReceived() }, [fetchReceived])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!toUserId)       { setSendError('Select a team member'); return }
    if (!subject.trim()) { setSendError('Subject is required');  return }
    setSending(true); setSendError(''); setSendSuccess('')
    try {
      await sendUpdateRequest(teamId, userId, Number(toUserId), subject.trim(), body.trim() || null)
      setSendSuccess('Request sent!')
      setToUserId(''); setSubject(''); setBody('')
      fetchSent()
    } catch (err) {
      setSendError(err?.response?.data?.detail || err.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async (reqId) => {
    try {
      await cancelUpdateRequest(reqId, userId)
      fetchSent()
    } catch { /* silent */ }
  }

  const openRespond = (reqId) => {
    setRespondingId(reqId === respondingId ? null : reqId)
    setResponseText('')
    setRespondError('')
  }

  const handleRespond = async (req) => {
    if (!responseText.trim()) { setRespondError('Response cannot be empty'); return }
    setResponding(true); setRespondError('')
    try {
      await respondToRequest(req.id, userId, responseText.trim())
      setRespondingId(null); setResponseText('')
      fetchReceived()
    } catch (err) {
      setRespondError(err?.response?.data?.detail || err.message || 'Failed to respond')
    } finally {
      setResponding(false)
    }
  }

  // All team members except self are valid recipients
  const recipients = members.filter(m => m.user_id !== userId)

  const pending = requests.filter(r => r.status === 'pending')
  const history = requests.filter(r => r.status !== 'pending')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Update Requests</h1>
      </div>

      {/* ── Compose ─────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>New Request</h2>
        <form className={styles.composeForm} onSubmit={handleSend} noValidate>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>To</label>
              <select
                className={styles.select}
                value={toUserId}
                onChange={e => setToUserId(e.target.value)}
                disabled={sending}
              >
                <option value="">Select member…</option>
                {recipients.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fieldGrow}`}>
              <label className={styles.label}>Subject</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Logistics update for Monday"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={sending}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Message (optional)</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Please share the current status of…"
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={sending}
            />
          </div>
          {sendError   && <p className={styles.error}>{sendError}</p>}
          {sendSuccess && <p className={styles.success}>{sendSuccess}</p>}
          <button type="submit" className={styles.btn} disabled={sending}>
            {sending ? 'Sending…' : 'Send Request →'}
          </button>
        </form>
      </section>

      {/* ── Sent Requests ────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Sent
          {sentRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className={styles.count}>
              {sentRequests.filter(r => r.status === 'pending').length} pending
            </span>
          )}
        </h2>

        {sentLoading ? (
          <p className={styles.muted}>Loading…</p>
        ) : sentRequests.length === 0 ? (
          <p className={styles.muted}>No requests sent yet.</p>
        ) : (
          <div className={styles.list}>
            {sentRequests.map(req => {
              const isExpanded = expandedId === req.id
              const hasDetail  = req.body || req.response_body
              return (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestMeta}>
                    <div className={styles.requestInfo}>
                      <span className={styles.requestTo}>
                        To: <strong>{memberMap[req.to_user_id] || `Member #${req.to_user_id}`}</strong>
                      </span>
                      <span className={styles.requestSubject}>{req.subject}</span>
                    </div>
                    <div className={styles.requestRight}>
                      <StatusBadge status={req.status} />
                      <span className={styles.requestDate}>{fmtDate(req.created_at)}</span>
                      {req.status === 'pending' && (
                        <button className={styles.cancelBtn} onClick={() => handleCancel(req.id)}>
                          Cancel
                        </button>
                      )}
                      {hasDetail && (
                        <button
                          className={styles.expandBtn}
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className={styles.expandedBody}>
                      {req.body && (
                        <div className={styles.expandBlock}>
                          <p className={styles.expandLabel}>Message sent:</p>
                          <p className={styles.expandText}>{req.body}</p>
                        </div>
                      )}
                      {req.response_body && (
                        <div className={`${styles.expandBlock} ${styles.responseBlock}`}>
                          <p className={styles.expandLabel}>
                            Response from {memberMap[req.to_user_id]}:
                          </p>
                          <p className={styles.expandText}>{req.response_body}</p>
                          {req.responded_at && (
                            <p className={styles.respondedAt}>Responded {fmtDate(req.responded_at)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Inbox ────────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Inbox
          {pending.length > 0 && <span className={styles.count}>{pending.length}</span>}
        </h2>

        {recvLoading ? (
          <p className={styles.muted}>Loading…</p>
        ) : pending.length === 0 ? (
          <p className={styles.muted}>No pending requests.</p>
        ) : (
          <div className={styles.list}>
            {pending.map(req => (
              <div key={req.id} className={`${styles.requestCard} ${styles.requestCardPending}`}>
                <div className={styles.requestMeta}>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestTo}>
                      From: <strong>{memberMap[req.from_user_id] || `Member #${req.from_user_id}`}</strong>
                    </span>
                    <span className={styles.requestSubject}>{req.subject}</span>
                    {req.body && (
                      <span className={styles.requestBodyPreview}>{req.body}</span>
                    )}
                  </div>
                  <div className={styles.requestRight}>
                    <span className={styles.requestDate}>{fmtDate(req.created_at)}</span>
                    <button
                      className={styles.respondBtn}
                      onClick={() => openRespond(req.id)}
                    >
                      {respondingId === req.id ? 'Cancel' : 'Respond'}
                    </button>
                  </div>
                </div>

                {respondingId === req.id && (
                  <div className={styles.respondForm}>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      placeholder="Your update…"
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      disabled={responding}
                      autoFocus
                    />
                    {respondError && <p className={styles.error}>{respondError}</p>}
                    <div className={styles.respondActions}>
                      <button
                        className={styles.btnSecondary}
                        type="button"
                        onClick={() => { setRespondingId(null); setResponseText('') }}
                        disabled={responding}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.btn}
                        type="button"
                        onClick={() => handleRespond(req)}
                        disabled={responding}
                      >
                        {responding ? 'Sending…' : 'Submit Response →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── History ──────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>History</h2>
          <div className={styles.list}>
            {history.map(req => (
              <div key={req.id} className={styles.requestCard}>
                <div className={styles.requestMeta}>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestTo}>
                      From: <strong>{memberMap[req.from_user_id] || `Member #${req.from_user_id}`}</strong>
                    </span>
                    <span className={styles.requestSubject}>{req.subject}</span>
                  </div>
                  <div className={styles.requestRight}>
                    <StatusBadge status={req.status} />
                    <span className={styles.requestDate}>{fmtDate(req.created_at)}</span>
                  </div>
                </div>
                {req.response_body && (
                  <div className={styles.expandedBody}>
                    <div className={styles.expandBlock}>
                      <p className={styles.expandLabel}>Your response:</p>
                      <p className={styles.expandText}>{req.response_body}</p>
                      {req.responded_at && (
                        <p className={styles.respondedAt}>Sent {fmtDate(req.responded_at)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
