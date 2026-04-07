// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const KPI_CONFIG = [
  { key: 'totCandidati', label: 'Candidati totali', emoji: '👤', grad: 'linear-gradient(135deg, #6366f1, #8b5cf6)', nav: 'candidati' },
  { key: 'inAttesa', label: 'In attesa', emoji: '⏳', grad: 'linear-gradient(135deg, #f59e0b, #f97316)', nav: 'candidati' },
  { key: 'colloquio', label: 'Colloquio fissato', emoji: '📋', grad: 'linear-gradient(135deg, #3b82f6, #6366f1)', nav: 'agenda' },
  { key: 'formazione', label: 'In formazione', emoji: '🎓', grad: 'linear-gradient(135deg, #8b5cf6, #ec4899)', nav: 'corsi' },
  { key: 'collocato', label: 'Collocati', emoji: '✅', grad: 'linear-gradient(135deg, #10b981, #059669)', nav: 'candidati' },
  { key: 'corsiAttivi', label: 'Corsi attivi', emoji: '📚', grad: 'linear-gradient(135deg, #06b6d4, #3b82f6)', nav: 'corsi' },
  { key: 'inviiOggi', label: 'Messaggi oggi', emoji: '💬', grad: 'linear-gradient(135deg, #f43f5e, #ec4899)', nav: 'comunicazioni' },
]

export default function Dashboard({ onNavigate }) {
  const { profile, can } = useAuth()
  const [kpi, setKpi] = useState(null)
  const [prossimiAppt, setProssimiAppt] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    let candQuery = supabase.from('candidati').select('stato', { count: 'exact' })
    if (!can.viewAll) candQuery = candQuery.eq('referente_id', profile.id)
    const { data: cands } = await candQuery
    const counts = {}
    cands?.forEach(c => counts[c.stato] = (counts[c.stato] || 0) + 1)
    const { count: corsiAttivi } = await supabase.from('corsi').select('*', { count: 'exact', head: true }).eq('stato', 'in_corso')
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)
    let apptQuery = supabase.from('appuntamenti')
      .select('*, candidati(nome, cognome), profiles(nome, cognome)')
      .eq('stato', 'attivo').gte('data', today)
      .lte('data', nextWeek.toISOString().slice(0, 10))
      .order('data').order('ora_inizio').limit(8)
    if (!can.viewAll) apptQuery = apptQuery.eq('operatore_id', profile.id)
    const { data: appts } = await apptQuery
    const { count: inviiOggi } = await supabase.from('log_invii')
      .select('*', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00')
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

  const TIPO_COLOR = { colloquio:'#6366f1', formazione:'#8b5cf6', riunione:'#10b981', altro:'#9ca3af' }
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--grad-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚡</div>
      <div style={{ color:'var(--text-secondary)', fontSize:14 }}>Caricamento dashboard...</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.greeting}>{greeting}, {profile?.nome} 👋</h1>
          <p style={s.date}>{new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        <button style={s.refreshBtn} onClick={loadData}>↻ Aggiorna</button>
      </div>

      {/* KPI Grid */}
      <div style={s.kpiGrid}>
        {KPI_CONFIG.map((k, i) => (
          <div key={i} style={s.kpiCard} onClick={() => onNavigate(k.nav)}>
            <div style={{ ...s.kpiIcon, background: k.grad }}>
              <span style={{ fontSize: 18 }}>{k.emoji}</span>
            </div>
            <div style={s.kpiVal}>{kpi[k.key]}</div>
            <div style={s.kpiLabel}>{k.label}</div>
            <div style={{ ...s.kpiBar, background: k.grad }} />
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={s.bottomGrid}>
        {/* Prossimi appuntamenti */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>
              <span style={s.cardIcon}>📅</span>
              Prossimi appuntamenti
            </div>
            <button style={s.linkBtn} onClick={() => onNavigate('agenda')}>Vedi tutti →</button>
          </div>
          {prossimiAppt.length === 0
            ? <div style={s.empty}>
                <span style={{ fontSize: 32 }}>📭</span>
                <div>Nessun appuntamento nei prossimi 7 giorni</div>
              </div>
            : prossimiAppt.map(a => (
              <div key={a.id} style={s.apptRow}>
                <div style={{ ...s.apptDot, background: TIPO_COLOR[a.tipo] || '#9ca3af' }} />
                <div style={s.apptInfo}>
                  <div style={s.apptTitle}>{a.titolo}</div>
                  <div style={s.apptMeta}>
                    {fmtDate(a.data)} · {a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)} · {a.sala}
                    {a.profiles && ` · ${a.profiles.nome} ${a.profiles.cognome}`}
                  </div>
                </div>
                {a.candidati && (
                  <div style={s.apptCand}>{a.candidati.nome} {a.candidati.cognome}</div>
                )}
              </div>
            ))
          }
        </div>

        {/* Riepilogo stati */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>
              <span style={s.cardIcon}>📊</span>
              Riepilogo candidati
            </div>
            <button style={s.linkBtn} onClick={() => onNavigate('candidati')}>Dettaglio →</button>
          </div>
          {[
            { label:'In attesa', val:kpi.inAttesa, tot:kpi.totCandidati, color:'#f59e0b' },
            { label:'Colloquio fissato', val:kpi.colloquio, tot:kpi.totCandidati, color:'#3b82f6' },
            { label:'In formazione', val:kpi.formazione, tot:kpi.totCandidati, color:'#8b5cf6' },
            { label:'Collocati', val:kpi.collocato, tot:kpi.totCandidati, color:'#10b981' },
          ].map((item, i) => (
            <div key={i} style={s.statRow}>
              <div style={s.statLabel}>{item.label}</div>
              <div style={s.statBarWrap}>
                <div style={{ ...s.statBar, width: item.tot ? `${Math.round(item.val/item.tot*100)}%` : '0%', background: item.color }} />
              </div>
              <div style={{ ...s.statVal, color: item.color }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem', flexWrap:'wrap', gap:12 },
  greeting: { fontSize:26, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-0.5px' },
  date: { fontSize:13, color:'var(--text-muted)', marginTop:4 },
  refreshBtn: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', color:'var(--text-secondary)', fontFamily:'var(--font)', boxShadow:'var(--shadow-sm)' },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:'1.5rem' },
  kpiCard: { background:'var(--surface)', borderRadius:'var(--radius)', padding:'1.1rem', cursor:'pointer', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', position:'relative', overflow:'hidden', transition:'all 0.15s' },
  kpiIcon: { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, boxShadow:'0 4px 12px rgba(0,0,0,0.15)' },
  kpiVal: { fontSize:28, fontWeight:700, color:'var(--text)', lineHeight:1, letterSpacing:'-1px' },
  kpiLabel: { fontSize:12, color:'var(--text-secondary)', marginTop:4, fontWeight:500 },
  kpiBar: { position:'absolute', bottom:0, left:0, right:0, height:3, opacity:0.6 },
  bottomGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  card: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.25rem', boxShadow:'var(--shadow-sm)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  cardTitle: { fontSize:14, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:8 },
  cardIcon: { fontSize:16 },
  linkBtn: { background:'none', border:'none', color:'var(--primary)', fontSize:12, cursor:'pointer', fontWeight:500, fontFamily:'var(--font)' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'2rem', color:'var(--text-muted)', fontSize:13 },
  apptRow: { display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border-light)' },
  apptDot: { width:8, height:8, borderRadius:'50%', flexShrink:0, boxShadow:'0 0 6px currentColor' },
  apptInfo: { flex:1, minWidth:0 },
  apptTitle: { fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  apptMeta: { fontSize:11, color:'var(--text-muted)', marginTop:2 },
  apptCand: { fontSize:12, color:'var(--primary)', fontWeight:500, flexShrink:0 },
  statRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-light)' },
  statLabel: { fontSize:12, color:'var(--text-secondary)', width:130, flexShrink:0 },
  statBarWrap: { flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' },
  statBar: { height:'100%', borderRadius:3, transition:'width 0.5s ease' },
  statVal: { fontSize:14, fontWeight:700, width:28, textAlign:'right', flexShrink:0 },
}
