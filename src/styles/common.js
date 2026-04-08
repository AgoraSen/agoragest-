// src/styles/common.js
// Stili condivisi per tutte le pagine del gestionale

export const cs = {
  // Layout
  wrap: { maxWidth: 1100, margin: '0 auto' },
  wrapWide: { maxWidth: 1300, margin: '0 auto' },
  topbar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text)', flex: 1, margin: 0, letterSpacing: '-0.4px' },

  // Cards
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' },
  cardSm: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)' },

  // Tabs
  tabs: { display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' },
  tab: { padding: '6px 16px', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)', background: 'var(--surface)', fontFamily: 'var(--font)', fontWeight: 500, transition: 'all 0.15s' },
  tabActive: { background: 'var(--grad-primary)', color: '#fff', borderColor: 'transparent', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },

  // Table
  tableWrap: { overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--border-light)', color: 'var(--text)', verticalAlign: 'middle' },

  // Form
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' },
  input: { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', fontFamily: 'var(--font)' },
  select: { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', width: '100%' },
  textarea: { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', fontFamily: 'var(--font)', resize: 'vertical' },

  // Buttons
  btnPrimary: { background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  btnSecondary: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 },
  btnDanger: { background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 },
  btnSmall: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font)' },
  btnSuccess: { background: 'var(--grad-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 },

  // Badges
  badge: { display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,14,23,0.5)', zIndex: 20, backdropFilter: 'blur(4px)' },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', zIndex: 30, width: 'min(520px,96vw)', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-lg)' },
  modalTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  closeBtn: { background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 16, cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, lineHeight: 1 },

  // Detail labels
  dl: { fontSize: 11, color: 'var(--text-muted)', marginTop: 12, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
  dv: { fontSize: 14, color: 'var(--text)', wordBreak: 'break-word' },

  // Section
  sectionLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Misc
  empty: { padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
  suggest: { border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', maxHeight: 180, overflowY: 'auto', boxShadow: 'var(--shadow)' },
  suggestItem: { padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' },
  infoRow: { display: 'flex', gap: 8, fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-light)' },
  infoLabel: { color: 'var(--text-secondary)', minWidth: 140, flexShrink: 0, fontWeight: 500 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Grid 2 col
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  // Pager
  pager: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' },
  pageBtn: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)' },
}
