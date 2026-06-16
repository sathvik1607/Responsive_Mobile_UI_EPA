import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import styles from './MoreSheet.module.css'

export default function MoreSheet({ open, onClose }) {
  const navigate    = useNavigate()
  const { user, role, logout } = useUser()
  const displayName = user?.name ?? 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const go = (path) => {
    onClose()
    navigate(path)
  }

  const handleLogout = () => {
    onClose()
    logout()
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true">
        <div className={styles.handle} />

        {/* Profile row (display only) */}
        <div className={styles.profile}>
          <div className={styles.profileAvatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            {role === 'owner' && (
              <span className={`${styles.roleBadge} ${styles.roleOwner}`}>Team Lead</span>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        <nav className={styles.items}>
          <button className={styles.item} onClick={() => go('/requests')}>
            <RequestsIcon />
            <span>Requests</span>
          </button>
          <button className={styles.item} onClick={() => go('/context')}>
            <BrainIcon />
            <span>Memory</span>
          </button>
          <button className={styles.item} onClick={() => go('/calendar')}>
            <CalIcon />
            <span>Calendar</span>
          </button>
        </nav>

        <div className={styles.divider} />

        <div className={styles.items}>
          <button className={`${styles.item} ${styles.itemLogout}`} onClick={handleLogout}>
            <LogoutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function RequestsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
}
function BrainIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
}
function CalIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function LogoutIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
