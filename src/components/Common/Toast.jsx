import styles from './Toast.module.css'

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.icon}>{ICONS[toast.type] || ICONS.info}</span>
          <span className={styles.message}>{toast.message}</span>
          <button className={styles.close} onClick={() => onRemove(toast.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
