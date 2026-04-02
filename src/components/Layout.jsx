// src/components/Layout.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'candidati', label: 'Candidati', icon: '◉' },
  { id: 'agenda', label: 'Agenda', icon: '◷' },
  { id: 'corsi', label: 'Corsi', icon: '◫' },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: '◻' },
  { id: 'automazioni', label: 'Automazioni', icon: '◈' },
  { id: 'impostazioni', label: 'Impostazioni', icon: '◎' },
]

const NAV_ADMIN = [
  { id: 'utenti', label: 'Utenti', icon: '◎' },
]

export default function Layout({ children, page, onNavigate }) {
  const { profile, signOut, can } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const allNav = can.manageUsers ? [...NAV, ...NAV_ADMIN] : NAV

  return (
    <div style={styles.root}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, ...(mobileOpen ? styles.sidebarOpen : {}) }}>
        <div style={styles.logo}>
          <div style={styles.logoMark}>A</div>
          <div>
            <div style={styles.logoName}>Agorà</div>
            <div style={styles.logoSub}>Gestionale</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {allNav.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(page === item.id ? styles.navActive : {}),
              }}
              onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.userBox}>
          <div style={styles.userAvatar}>
            {(profile?.nome?.[0] || '?')}{(profile?.cognome?.[0] || '')}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{profile?.nome} {profile?.cognome}</div>
            <div style={styles.userRole}>{
              profile?.ruolo === 'admin' ? 'Amministratore' :
              profile?.ruolo === 'senior' ? 'Operatore senior' : 'Operatore'
            }</div>
          </div>
          <button style={styles.signOutBtn} onClick={signOut} title="Esci">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Mobile topbar */}
        <div style={styles.mobileBar}>
          <button style={styles.menuBtn} onClick={() => setMobileOpen(true)}>☰</button>
          <span style={styles.mobileTitle}>Agorà Gestionale</span>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f4f0',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  sidebar: {
    width: 220,
    background: '#1a3a5c',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    zIndex: 100,
    transition: 'transform 0.2s',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 99,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
    borderBottom: '0.5px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontFamily: 'Georgia, serif',
    fontWeight: 600,
    flexShrink: 0,
  },
  logoName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    fontFamily: 'Georgia, serif',
  },
  logoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  nav: {
    flex: 1,
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background 0.1s, color 0.1s',
  },
  navActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  navIcon: {
    fontSize: 14,
    width: 16,
    textAlign: 'center',
    flexShrink: 0,
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderTop: '0.5px solid rgba(255,255,255,0.1)',
    marginTop: 'auto',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  signOutBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  mobileBar: {
    display: 'none',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#1a3a5c',
    '@media (max-width: 768px)': { display: 'flex' },
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
  },
  mobileTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 500,
  },
  content: {
    padding: '1.5rem',
    flex: 1,
  },
}
