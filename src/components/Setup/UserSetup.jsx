import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { registerOwner, registerMember, getTeams } from '../../services/userService'
import styles from './UserSetup.module.css'

// UserSetup — auth screen with three modes:
//   loginMode = false, tab = 'owner'  → Create a Company (owner registration)
//   loginMode = false, tab = 'member' → Join a Company (member registration)
//   loginMode = true                  → Sign In
//
// Name fields strip spaces on change (no spaces allowed in usernames).
// After successful registration, loginWithData() sets auth state directly
// without a second login call so the user lands in the app immediately.
export default function UserSetup({ loginMode = false }) {
  const [tab, setTab]         = useState('owner')
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [slowHint, setSlowHint] = useState(false)
  const hintTimer               = useRef(null)
  const { loginWithData, login } = useUser()
  const navigate                 = useNavigate()

  // Owner form
  const [ownerName,    setOwnerName]    = useState('')
  const [companyName,  setCompanyName]  = useState('')
  const [ownerPwd,     setOwnerPwd]     = useState('')

  // Member form
  const [memberName,   setMemberName]   = useState('')
  const [memberPwd,    setMemberPwd]    = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')

  useEffect(() => {
    if (tab === 'member') {
      getTeams().then(setTeams).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    if (loading) {
      hintTimer.current = setTimeout(() => setSlowHint(true), 4000)
    } else {
      clearTimeout(hintTimer.current)
      setSlowHint(false)
    }
    return () => clearTimeout(hintTimer.current)
  }, [loading])

  const handleOwnerSubmit = async (e) => {
    e.preventDefault()
    if (!ownerName.trim())        { setError('Name is required');                                          return }
    if (/\d/.test(ownerName))     { setError('Do not add numbers in your name. Please use your full name.'); return }
    if (!companyName.trim())      { setError('Company name is required');                                  return }
    if (!ownerPwd)                { setError('Password is required');                                      return }
    setLoading(true)
    setError('')
    try {
      const data = await registerOwner(ownerName.trim(), companyName.trim(), ownerPwd)
      loginWithData(data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || err.message || 'Registration failed.')
      setLoading(false)
    }
  }

  const handleMemberSubmit = async (e) => {
    e.preventDefault()
    if (!memberName.trim())       { setError('Name is required');                                          return }
    if (/\d/.test(memberName))    { setError('Do not add numbers in your name. Please use your full name.'); return }
    if (!selectedTeam)            { setError('Please select a company');                                   return }
    if (!memberPwd)               { setError('Password is required');                                      return }
    setLoading(true)
    setError('')
    try {
      const data = await registerMember(memberName.trim(), Number(selectedTeam), memberPwd)
      loginWithData(data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || err.message || 'Registration failed.')
      setLoading(false)
    }
  }

  const [loginName, setLoginName] = useState('')
  const [loginPwd,  setLoginPwd]  = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginName.trim()) { setError('Username is required'); return }
    if (!loginPwd)         { setError('Password is required'); return }
    setLoading(true)
    setError('')
    try {
      await login(loginName.trim(), loginPwd)
    } catch (err) {
      setError(err.message || 'Could not sign in.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <AlumnxSvg size={44} />
        </div>
        <h1 className={styles.title}>ALUMNX AI LABS</h1>
        <p className={styles.subtitle}>Personal Assistant</p>

        {!loginMode ? (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'owner' ? styles.tabActive : ''}`}
                onClick={() => { setTab('owner'); setError('') }}
                disabled={loading}
              >
                Create a Company
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'member' ? styles.tabActive : ''}`}
                onClick={() => { setTab('member'); setError('') }}
                disabled={loading}
              >
                Join a Company
              </button>
            </div>

            {tab === 'owner' ? (
              <form className={styles.form} onSubmit={handleOwnerSubmit} noValidate>
                <label className={styles.label}>Team Lead Name</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. alexjohnson"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value.replace(/\s/g, ''))} // strip spaces — usernames must be one word
                  autoFocus
                  disabled={loading}
                />
                {/\d/.test(ownerName) && (
                  <p className={styles.fieldHint}>Do not add numbers in your name. Please use your full name.</p>
                )}
                <label className={styles.label}>Company Name</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Acme Technologies"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  disabled={loading}
                />
                <label className={styles.label}>Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={ownerPwd}
                  onChange={e => setOwnerPwd(e.target.value)}
                  disabled={loading}
                />
                <p className={styles.warning}>
                  ⚠️ Your name and password cannot be changed after registration. Choose carefully.
                </p>
                {error && <p className={styles.error}>{error}</p>}
                {slowHint && <p className={styles.hint}>Waking up server, please wait…</p>}
                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Creating…' : 'Register as Owner →'}
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={handleMemberSubmit} noValidate>
                <label className={styles.label}>Member Name</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. jordanlee"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value.replace(/\s/g, ''))} // strip spaces — usernames must be one word
                  autoFocus
                  disabled={loading}
                />
                {/\d/.test(memberName) && (
                  <p className={styles.fieldHint}>Do not add numbers in your name. Please use your full name.</p>
                )}
                <label className={styles.label}>Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={memberPwd}
                  onChange={e => setMemberPwd(e.target.value)}
                  disabled={loading}
                />
                <label className={styles.label}>Company</label>
                <select
                  className={styles.select}
                  value={selectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a company…</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className={styles.warning}>
                  ⚠️ Your name and password cannot be changed after registration. Choose carefully.
                </p>
                {error && <p className={styles.error}>{error}</p>}
                {slowHint && <p className={styles.hint}>Waking up server, please wait…</p>}
                <button type="submit" className={styles.btn} disabled={loading}>
                  {loading ? 'Joining…' : 'Join Company →'}
                </button>
              </form>
            )}

            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => { setError(''); navigate('/login') }}
            >
              Already have an account? Sign In →
            </button>
          </>
        ) : (
          <>
            <form className={styles.form} onSubmit={handleLogin} noValidate>
              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. alex.johnson"
                value={loginName}
                onChange={e => setLoginName(e.target.value.replace(/\s/g, ''))} // strip spaces — usernames have no spaces
                autoFocus
                disabled={loading}
              />
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={loginPwd}
                onChange={e => setLoginPwd(e.target.value)}
                disabled={loading}
              />
              {error && <p className={styles.error}>{error}</p>}
              {slowHint && <p className={styles.hint}>Waking up server, please wait…</p>}
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => { setError(''); navigate('/register') }}
            >
              ← New here? Register
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── AlumnX brand SVG ──────────────────────────────────────────────────────────

function AlumnxSvg({ size = 44 }) {
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
