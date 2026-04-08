// src/components/Layout.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▪', emoji: '⬡' },
  { id: 'candidati', label: 'Candidati', icon: '●', emoji: '👤' },
  { id: 'aziende', label: 'Aziende', icon: '■', emoji: '🏢' },
  { id: 'agenda', label: 'Agenda', icon: '◷', emoji: '📅' },
  { id: 'corsi', label: 'Corsi', emoji: '🎓' },
  { id: 'comunicazioni', label: 'Comunicazioni', emoji: '💬' },
  { id: 'automazioni', label: 'Automazioni', emoji: '⚡' },
  { id: 'impostazioni', label: 'Impostazioni', emoji: '⚙️' },
]

const NAV_ADMIN = [
  { id: 'utenti', label: 'Utenti', emoji: '👥' },
]

const SECTION_LABELS = {
  dashboard: null,
  candidati: 'CRM',
  aziende: 'CRM',
  agenda: 'Operativo',
  corsi: 'Operativo',
  comunicazioni: 'Comunicazione',
  automazioni: 'Comunicazione',
  impostazioni: 'Sistema',
  utenti: 'Sistema',
}

export default function Layout({ children, page, onNavigate }) {
  const { profile, signOut, can } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const allNav = can.manageUsers ? [...NAV, ...NAV_ADMIN] : NAV

  // Raggruppa per sezione
  const sections = []
  allNav.forEach(item => {
    const sec = SECTION_LABELS[item.id] || null
    const last = sections[sections.length - 1]
    if (!last || last.label !== sec) {
      sections.push({ label: sec, items: [item] })
    } else {
      last.items.push(item)
    }
  })

  const roleLabel = profile?.ruolo === 'admin' ? 'Amministratore' : profile?.ruolo === 'senior' ? 'Senior' : 'Operatore'

  return (
    <div style={S.root}>
      {mobileOpen && <div style={S.overlay} onClick={() => setMobileOpen(false)} />}

      <aside style={{ ...S.sidebar, ...(mobileOpen ? S.sidebarOpen : {}), ...(collapsed ? S.sidebarCollapsed : {}) }}>
        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoMark}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>A</span>
          </div>
          {!collapsed && (
            <div style={{ flex: 1 }}>
              <div style={S.logoName}>Agorà</div>
              <div style={S.logoSub}>Gestionale</div>
            </div>
          )}
          <button style={S.collapseBtn} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Espandi' : 'Comprimi'}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav */}
        <nav style={S.nav}>
          {sections.map((section, si) => (
            <div key={si}>
              {!collapsed && section.label && (
                <div style={S.sectionLabel}>{section.label}</div>
              )}
              {section.items.map(item => (
                <button
                  key={item.id}
                  style={{ ...S.navItem, ...(page === item.id ? S.navActive : {}) }}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
                  title={collapsed ? item.label : undefined}
                >
                  <span style={S.navEmoji}>{item.emoji || '▪'}</span>
                  {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                  {!collapsed && page === item.id && <span style={S.navDot} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ ...S.userBox, ...(collapsed ? S.userBoxCollapsed : {}) }}>
          <div style={S.userAvatar}>
            {(profile?.nome?.[0] || '?')}{(profile?.cognome?.[0] || '')}
          </div>
          {!collapsed && (
            <div style={S.userInfo}>
              <div style={S.userName}>{profile?.nome} {profile?.cognome}</div>
              <div style={S.userRole}>{roleLabel}</div>
            </div>
          )}
          <button style={S.signOutBtn} onClick={signOut} title="Esci">⏻</button>
        </div>
      </aside>

      <main style={S.main}>
        {/* Mobile bar */}
        <div style={S.mobileBar}>
          <button style={S.menuBtn} onClick={() => setMobileOpen(true)}>☰</button>
          <div style={S.mobileLogo}>
            <div style={{ ...S.logoMark, width: 28, height: 28, fontSize: 14 }}>A</div>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Agorà</span>
          </div>
        </div>
        <div style={S.content}>
          {children}
        </div>
      </main>
    </div>
  )
}

const S = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)',
    fontFamily: 'var(--font)',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 99,
    backdropFilter: 'blur(2px)',
  },
  sidebar: {
    width: 224,
    background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    zIndex: 100,
    transition: 'width 0.2s ease',
    boxShadow: '2px 0 20px rgba(99,102,241,0.15)',
  },
  sidebarCollapsed: {
    width: 64,
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--grad-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
  },
  logoName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  logoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  collapseBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 6px',
    borderRadius: 6,
    marginLeft: 'auto',
    flexShrink: 0,
    lineHeight: 1,
  },
  nav: {
    flex: 1,
    padding: '4px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    padding: '12px 8px 4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: 400,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    position: 'relative',
    transition: 'all 0.15s ease',
  },
  navActive: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)',
    color: '#fff',
    fontWeight: 500,
    boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.3)',
  },
  navEmoji: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--grad-primary)',
    boxShadow: '0 0 6px rgba(99,102,241,0.6)',
    flexShrink: 0,
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: 'auto',
  },
  userBoxCollapsed: {
    flexDirection: 'column',
    gap: 6,
    padding: '12px 8px',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--grad-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  signOutBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    color: 'rgba(255,255,255,0.35)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '5px 6px',
    borderRadius: 6,
    flexShrink: 0,
    lineHeight: 1,
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
    background: 'linear-gradient(135deg, #0f0e1a 0%, #1a1830 100%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    padding: 0,
  },
  mobileLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    padding: '1.75rem',
    flex: 1,
  },
}
