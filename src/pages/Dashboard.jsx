// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard({ onNavigate }) {
  const { profile, can } = useAuth()
  const [kpi, setKpi] = useState(null)
  const [prossimiAppt, setProssimiAppt] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)

    // KPI candidati
    let candQuery = supabase.from('candidati').select('stato', { count: 'exact' })
    if (!can.viewAll) candQuery = candQuery.eq('referente_id', profile.id)
    const { data: cands } = await candQuery

    const counts = {}
    cands?.forEach(c => counts[c.stato] = (counts[c.stato] || 0) + 1)

    // Corsi attivi
    const { count: corsiAttivi } = await supabase
      .from('corsi').select('*', { count: 'exact', head: true })
      .eq('stato', 'Attivo')

    // Prossimi appuntamenti (oggi + 7 giorni)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    let apptQuery = supabase
      .from('appuntamenti')
      .select('*, candidati(nome, cognome), profiles(nome, cognome)')
      .eq('stato', 'attivo')
      .gte('data', today)
      .lte('data', nextWeek.toISOString().slice(0, 10))
      .order('data', { ascending: true })
      .order('ora_inizio', { ascending: true })
      .limit(8)

    if (!can.viewAll)
      apptQuery = apptQuery.eq('operatore_id', profile.id)

    const { data: appts } = await apptQuery

    // Log invii oggi
    const { count: inviiOggi } = await supabase
      .from('log_invii').select('*', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00')

    setKpi({
      totCandidati: cands?.length || 0,
      inAttesa: counts['In attesa'] || 0,
      colloquio: counts['Colloquio fissato'] || 0,
      formazione: counts['In formazione'] || 0,
      collocato: counts['Collocato'] || 0,
      corsiAttivi: corsiAttivi || 0,
      inviiOggi: inviiOggi || 0,
    })
    setProssimiAppt(appts || [])
    setLoading(false)
  }

  function fmtDate(s) {
    if (!s) return '—'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }

  const TIPO_COLOR = {
    colloquio: '#B5D4F4',
    formazione: '#CECBF6',
    riunione: '#9FE1CB',
    altro: '#D3D1C7',
  }

  if (loading) return <div style={styles.loading}>Caricamento...</div>

  return (
    <div>
      <div style={styles.topbar}>
        <h2 style={styles.title}>
          Buongiorno, {profile?.nome} 👋
        </h2>
        <div style={styles.date}>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      {/* KPI */}
      <div style={styles.kpiGrid}>
        {[
          { label: 'Candidati totali', val: kpi.totCandidati, color: '#1a3a5c', onClick: () => onNavigate('candidati') },
          { label: 'In attesa', val: kpi.inAttesa, color: '#633806' },
          { label: 'Colloquio fissato', val: kpi.colloquio, color: '#0C447C' },
          { label: 'In formazione', val: kpi.formazione, color: '#3C3489' },
          { label: 'Collocati', val: kpi.collocato, color: '#27500A' },
          { label: 'Corsi attivi', val: kpi.corsiAttivi, color: '#1a3a5c', onClick: () => onNavigate('corsi') },
          { label: 'Messaggi oggi', val: kpi.inviiOggi, color: '#633806', onClick: () => onNavigate('comunicazioni') },
        ].map((k, i) => (
          <div key={i} style={{ ...styles.kpi, cursor: k.onClick ? 'pointer' : 'default' }} onClick={k.onClick}>
            <div style={{ ...styles.kpiVal, color: k.color }}>{k.val}</div>
            <div style={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Prossimi appuntamenti */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Prossimi appuntamenti</h3>
          <button style={styles.linkBtn} onClick={() => onNavigate('agenda')}>Vedi agenda →</button>
        </div>
        {prossimiAppt.length === 0
          ? <div style={styles.empty}>Nessun appuntamento nei prossimi 7 giorni.</div>
          : prossimiAppt.map(a => (
            <div key={a.id} style={styles.apptRow}>
              <div style={{ ...styles.apptDot, background: TIPO_COLOR[a.tipo] || '#D3D1C7' }} />
              <div style={styles.apptInfo}>
                <div style={styles.apptTitle}>{a.titolo}</div>
                <div style={styles.apptMeta}>
                  {fmtDate(a.data)} · {a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)} · {a.sala}
                  {a.profiles && ` · ${a.profiles.nome} ${a.profiles.cognome}`}
                </div>
              </div>
              {a.candidati && (
                <div style={styles.apptCand}>{a.candidati.nome} {a.candidati.cognome}</div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}

const styles = {
  loading: { padding: '2rem', color: '#888', fontSize: 14 },
  topbar: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  date: { fontSize: 13, color: '#888' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: '1.5rem' },
  kpi: { background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12, padding: '14px 16px' },
  kpiVal: { fontSize: 30, fontWeight: 600, lineHeight: 1 },
  kpiLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  section: { background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12, padding: '1rem 1.25rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  linkBtn: { background: 'none', border: 'none', color: '#1a3a5c', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  empty: { fontSize: 13, color: '#aaa', padding: '8px 0' },
  apptRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #f0ede8' },
  apptDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  apptInfo: { flex: 1 },
  apptTitle: { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  apptMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  apptCand: { fontSize: 12, color: '#1a3a5c', fontWeight: 500 },
}
