// src/pages/Login.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message === 'Invalid login credentials'
      ? 'Email o password non corretti.'
      : error.message)
    setLoading(false)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoMark}>A</div>
          <div>
            <div style={styles.logoName}>Agorà</div>
            <div style={styles.logoSub}>Gestionale interno</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="nome@agora.it"
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <div style={styles.footer}>
          Per richiedere l'accesso contatta l'amministratore.
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f4f0',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '0.5px solid #e0ddd6',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 380,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: '2rem',
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#1a3a5c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 600,
    fontFamily: 'Georgia, serif',
  },
  logoName: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a1a',
    fontFamily: 'Georgia, serif',
  },
  logoSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#555',
    fontWeight: 500,
  },
  input: {
    padding: '10px 12px',
    border: '0.5px solid #d0cdc6',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#fafaf8',
    color: '#1a1a1a',
  },
  error: {
    background: '#fef2f2',
    border: '0.5px solid #fca5a5',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#b91c1c',
  },
  btn: {
    background: '#1a3a5c',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 4,
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
}
