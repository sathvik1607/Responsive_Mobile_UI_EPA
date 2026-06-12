import { useContext } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ToastContainer from '../Common/Toast'
import ScheduleAlertPopup from '../Alert/ScheduleAlertPopup'
import { ToastContext } from '../../context/ToastContext'
import styles from './Layout.module.css'

export default function Layout() {
  const { toasts, removeToast } = useContext(ToastContext)

  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>

      <main className={styles.main}>
        <Outlet />
      </main>

      <div className={styles.bottomNav}>
        <BottomNav />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ScheduleAlertPopup />
    </div>
  )
}
