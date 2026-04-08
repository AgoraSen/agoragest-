// src/components/Layout.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', emoji: '⬡' },
  { id: 'candidati', label: 'Candidati', emoji: '👤' },
  { id: 'aziende', label: 'Aziende', emoji: '🏢' },
  { id: 'agenda', label: 'Agenda', emoji: '📅' },
  { id: 'corsi', label: 'Corsi', emoji: '🎓' },
  { id: 'comunicazioni', label: 'Comunicazioni', emoji: '💬' },
  { id: 'automazioni', label: 'Automazioni', emoji: '⚡' },
  { id: 'impostazioni', label: 'Impostazioni', emoji: '⚙️' },
]

const NAV_ADMIN = [
  { id: 'utenti', label: 'Utenti', emoji: '👥' },
]

const SECTIONS = {
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

  const sections = []
  allNav.forEach(item => {
    const sec = SECTIONS[item.id] || null
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
        <div style={S.logo}>
          <div style={S.logoMark}>A</div>
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
                  <span style={S.navEmoji}>{item.emoji}</span>
                  {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                  {!collapsed && page === item.id && <span style={S.navDot} />}
                </button>
              ))}
            </div>
          ))}
        </nav>

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
    background: 'rgba(0,0,0,0.4)',
    zIndex: 99,
    backdropFilter: 'blur(2px)',
  },
  sidebar: {
    width: 224,
    background: '#ffffff',
    borderRight: '1px solid #d1fae5',
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
    boxShadow: '2px 0 12px rgba(16,185,129,0.08)',
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
    padding: '20px 14px 16px',
    borderBottom: '1px solid #d1fae5',
    marginBottom: 8,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
  },
  logoName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0d1117',
    letterSpacing: '-0.3px',
  },
  logoSub: {
    fontSize: 11,
    color: '#9ca3af',
    letterSpacing: '0.3px',
  },
  collapseBtn: {
    background: '#f0fdf4',
    border: '1px solid #d1fae5',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: 13,
    padding: '4px 7px',
    borderRadius: 6,
    marginLeft: 'auto',
    flexShrink: 0,
    lineHeight: 1,
    fontFamily: 'var(--font)',
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
    fontWeight: 700,
    color: '#9ca3af',
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
    color: '#4b5563',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    position: 'relative',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font)',
  },
  navActive: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)',
    color: '#047857',
    fontWeight: 600,
    boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.2)',
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
    background: 'linear-gradient(135deg, #10b981, #059669)',
    boxShadow: '0 0 6px rgba(16,185,129,0.6)',
    flexShrink: 0,
  },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderTop: '1px solid #d1fae5',
    marginTop: 'auto',
    background: '#f0fdf4',
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
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0d1117',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  signOutBtn: {
    background: 'transparent',
    border: '1px solid #d1fae5',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: 13,
    padding: '5px 7px',
    borderRadius: 6,
    flexShrink: 0,
    lineHeight: 1,
    fontFamily: 'var(--font)',
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
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
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
