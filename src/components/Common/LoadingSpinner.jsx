import styles from './LoadingSpinner.module.css'

export default function LoadingSpinner({ size = 24, color }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderTopColor: color || 'var(--accent)' }}
      role="status"
      aria-label="Loading"
    />
  )
}
