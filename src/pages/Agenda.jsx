// src/pages/Agenda.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPI = ['colloquio','formazione','riunione','altro']
const TIPO_LABEL = { colloquio:'Colloquio', formazione:'Formazione', riunione:'Riunione', altro:'Altro' }
const TIPO_COLOR = { colloquio:'#B5D4F4', formazione:'#CECBF6', riunione:'#9FE1CB', altro:'#D3D1C7' }
const TIPO_TEXT = { colloquio:'#0C447C', formazione:'#3C3489', riunione:'#085041', altro:'#444441' }
const SALE = ['Sala Colloqui','Sala A','Sala B','Sala Riunioni']
const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
const H_START = 8

export default function Agenda() {
  const { profile, can } = useAuth()
  const [appuntamenti, setAppuntamenti] = useState([])
  const [candidati, setCandidati] = useState([])
  const [operatori, setOperatori] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterOp, setFilterOp] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [candSearch, setCandSearch] = useState('')
  const [candSuggests, setCandSuggests] = useState([])
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)

  useEffect(() => { loadOperatori(); loadCandidati() }, [])
  useEffect(() => { loadAppuntamenti() }, [weekOffset, filterOp])

  function weekDays(offset) {
    const d = new Date()
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1 + offset * 7)
    d.setHours(0,0,0,0)
    return Array.from({length:5}, (_,i) => { const r = new Date(d); r.setDate(d.getDate()+i); return r })
  }

  function fmtDate(d) { return d instanceof Date ? d.toISOString().slice(0,10) : d }
  function fmtShort(d) { return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'}) }
  function fmtIt(s) { if(!s)return '—'; const[y,m,dd]=s.split('-'); return `${dd}/${m}/${y}` }
  function isToday(d) { return fmtDate(d) === fmtDate(new Date()) }
  function timeToMin(t) { const[h,m]=t.split(':').map(Number); return h*60+m }

  async function loadOperatori() {
    const { data } = await supabase.from('profiles').select('id,nome,cognome').eq('attivo',true)
    setOperatori(data||[])
  }

  async function loadCandidati() {
    let q = supabase.from('candidati').select('id,nome,cognome,tel,email').order('cognome').limit(500)
    if (!can.viewAll) q = q.eq('referente_id', profile.id)
    const { data } = await q
    setCandidati(data||[])
  }

  async function loadAppuntamenti() {
    setLoading(true)
    const days = weekDays(weekOffset)
    const from = fmtDate(days[0])
    const to = fmtDate(days[4])
    let q = supabase
      .from('appuntamenti')
      .select('*, candidati(nome,cognome), profiles(nome,cognome)')
      .eq('stato','attivo')
      .gte('data', from)
      .lte('data', to)
      .order('data').order('ora_inizio')
    if (filterOp) q = q.eq('operatore_id', filterOp)
    const { data } = await q
    setAppuntamenti(data||[])
    setLoading(false)
  }

  function openNew(date, hour) {
    setEditId(null)
    setCandSearch('')
    setForm({
      tipo: 'colloquio',
      titolo: '',
      candidato_id: null,
      operatore_id: profile.id,
      sala: 'Sala Colloqui',
      data: date,
      ora_inizio: hour,
      ora_fine: String(parseInt(hour)+1).padStart(2,'0')+':00',
      note: '',
    })
    setShowModal(true)
  }

  function openEdit(a) {
    setEditId(a.id)
    setCandSearch(a.candidati ? `${a.candidati.nome} ${a.candidati.cognome}` : '')
    setForm({
      tipo: a.tipo,
      titolo: a.titolo,
      candidato_id: a.candidato_id,
      operatore_id: a.operatore_id,
      sala: a.sala,
      data: a.data,
      ora_inizio: a.ora_inizio?.slice(0,5),
      ora_fine: a.ora_fine?.slice(0,5),
      note: a.note||'',
    })
    setShowDetail(false)
    setShowModal(true)
  }

  async function saveAppt() {
    if (!form.titolo && !form.candidato_id) return
    const titolo = form.titolo || (candidati.find(c=>c.id===form.candidato_id) ? `${candidati.find(c=>c.id===form.candidato_id).nome} ${candidati.find(c=>c.id===form.candidato_id).cognome}` : '')
    const payload = { ...form, titolo }
    if (editId) {
      await supabase.from('appuntamenti').update(payload).eq('id', editId)
    } else {
      await supabase.from('appuntamenti').insert([payload])
      // aggiorna stato candidato se colloquio
      if (form.candidato_id && form.tipo === 'colloquio') {
        const { data: cand } = await supabase.from('candidati').select('stato').eq('id',form.candidato_id).single()
        if (cand?.stato === 'In attesa') {
          await supabase.from('candidati').update({stato:'Colloquio fissato'}).eq('id',form.candidato_id)
        }
      }
    }
    setShowModal(false)
    loadAppuntamenti()
  }

  async function cancelAppt(id) {
    await supabase.from('appuntamenti').update({stato:'cancellato'}).eq('id',id)
    setShowDetail(false)
    loadAppuntamenti()
  }

  function searchCand(q) {
    setCandSearch(q)
    if (!q) { setCandSuggests([]); return }
    const lower = q.toLowerCase()
    setCandSuggests(candidati.filter(c=>(c.nome+' '+c.cognome).toLowerCase().includes(lower)).slice(0,6))
  }

  function selectCand(c) {
    setForm(f=>({...f, candidato_id:c.id, titolo:`${c.nome} ${c.cognome}`}))
    setCandSearch(`${c.nome} ${c.cognome}`)
    setCandSuggests([])
  }

  const days = weekDays(weekOffset)
  const weekLabel = `${fmtShort(days[0])} – ${fmtShort(days[4])}`

  return (
    <div style={s.wrap}>
      {/* Topbar */}
      <div style={s.topbar}>
        <h2 style={s.title}>Agenda</h2>
        <div style={s.navWeek}>
          <button style={s.navBtn} onClick={()=>setWeekOffset(w=>w-1)}>‹</button>
          <span style={s.weekLabel}>{weekLabel}</span>
          <button style={s.navBtn} onClick={()=>setWeekOffset(w=>w+1)}>›</button>
        </div>
        <button style={s.btnSecondary} onClick={()=>setWeekOffset(0)}>Oggi</button>
        <select style={s.select} value={filterOp} onChange={e=>setFilterOp(e.target.value)}>
          <option value="">Tutti gli operatori</option>
          {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
        </select>
        <button style={s.btnPrimary} onClick={()=>openNew(fmtDate(new Date()),'09:00')}>+ Appuntamento</button>
      </div>

      {/* Legenda */}
      <div style={s.legend}>
        {TIPI.map(t=>(
          <div key={t} style={s.legItem}>
            <div style={{...s.legDot, background:TIPO_COLOR[t]}}/>
            {TIPO_LABEL[t]}
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div style={s.calWrap}>
        <div style={s.cal}>
          {/* Header */}
          <div style={{...s.grid, background:'var(--color-bg-sec, #f5f4f0)', borderBottom:'0.5px solid #e8e5e0'}}>
            <div style={s.timeCol}/>
            {days.map((d,i)=>(
              <div key={i} style={{...s.dayHead, ...(isToday(d)?s.dayHeadToday:{})}}>
                <span style={{fontSize:18,fontWeight:600,display:'block'}}>{d.getDate()}</span>
                {d.toLocaleDateString('it-IT',{weekday:'short'})}
              </div>
            ))}
          </div>
          {/* Body */}
          <div style={{position:'relative'}}>
            {HOURS.map((h,hi)=>(
              <div key={h} style={s.grid}>
                <div style={s.timeLabel}>{h}</div>
                {days.map((d,di)=>(
                  <div key={di} style={s.dayCell}
                    onClick={()=>openNew(fmtDate(d),h)}/>
                ))}
              </div>
            ))}
            {/* Events */}
            {appuntamenti.map(a=>{
              const dayIdx = days.findIndex(d=>fmtDate(d)===a.data)
              if (dayIdx<0) return null
              const sMin = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
              const eMin = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
              const top = (sMin - H_START*60)/60*48
              const ht = Math.max((eMin-sMin)/60*48-2, 18)
              return (
                <div key={a.id} style={{
                  position:'absolute',
                  top,
                  height:ht,
                  left:`calc(48px + ${dayIdx}*(100% - 48px)/5 + 2px)`,
                  width:`calc((100% - 48px)/5 - 4px)`,
                  background:TIPO_COLOR[a.tipo]||'#D3D1C7',
                  color:TIPO_TEXT[a.tipo]||'#444',
                  borderRadius:4,
                  padding:'2px 5px',
                  fontSize:11,
                  cursor:'pointer',
                  overflow:'hidden',
                  zIndex:2,
                }} onClick={e=>{e.stopPropagation();setSelectedAppt(a);setShowDetail(true)}}>
                  <div style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.titolo}</div>
                  {ht>28 && <div style={{opacity:.85}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && selectedAppt && (
        <>
          <div style={s.overlay} onClick={()=>setShowDetail(false)}/>
          <div style={s.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{...s.badge, background:TIPO_COLOR[selectedAppt.tipo], color:TIPO_TEXT[selectedAppt.tipo]}}>
                {TIPO_LABEL[selectedAppt.tipo]}
              </span>
              <button style={s.closeBtn} onClick={()=>setShowDetail(false)}>✕</button>
            </div>
            <div style={{fontSize:17,fontWeight:600,color:'#1a1a1a',margin:'8px 0'}}>{selectedAppt.titolo}</div>
            <div style={s.dl}>Candidato</div>
            <div style={s.dv}>{selectedAppt.candidati ? `${selectedAppt.candidati.nome} ${selectedAppt.candidati.cognome}` : '—'}</div>
            <div style={s.dl}>Operatore</div>
            <div style={s.dv}>{selectedAppt.profiles ? `${selectedAppt.profiles.nome} ${selectedAppt.profiles.cognome}` : '—'}</div>
            <div style={s.dl}>Sala</div>
            <div style={s.dv}>{selectedAppt.sala}</div>
            <div style={s.dl}>Orario</div>
            <div style={s.dv}>{fmtIt(selectedAppt.data)} · {selectedAppt.ora_inizio?.slice(0,5)}–{selectedAppt.ora_fine?.slice(0,5)}</div>
            {selectedAppt.note && <><div style={s.dl}>Note</div><div style={s.dv}>{selectedAppt.note}</div></>}
            <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}>
              <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>cancelAppt(selectedAppt.id)}>Annulla appuntamento</button>
              <button style={s.btnSecondary} onClick={()=>openEdit(selectedAppt)}>Modifica</button>
              <button style={s.btnPrimary} onClick={()=>setShowDetail(false)}>Chiudi</button>
            </div>
          </div>
        </>
      )}

      {/* New/Edit modal */}
      {showModal && (
        <>
          <div style={s.overlay} onClick={()=>setShowModal(false)}/>
          <div style={s.modal}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#1a1a1a',margin:0}}>{editId?'Modifica appuntamento':'Nuovo appuntamento'}</h3>
            <div style={s.field}>
              <label style={s.label}>Tipo</label>
              <select style={s.input} value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                {TIPI.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Candidato (opzionale)</label>
              <input style={s.input} placeholder="Cerca nome..." value={candSearch} onChange={e=>searchCand(e.target.value)}/>
              {candSuggests.length>0 && (
                <div style={s.suggest}>
                  {candSuggests.map(c=>(
                    <div key={c.id} style={s.suggestItem} onMouseDown={()=>selectCand(c)}>
                      {c.nome} {c.cognome} <span style={{color:'#aaa',fontSize:11}}>{c.tel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={s.field}>
              <label style={s.label}>Titolo</label>
              <input style={s.input} value={form.titolo||''} onChange={e=>setForm(f=>({...f,titolo:e.target.value}))} placeholder="Es. Riunione settimanale"/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Operatore</label>
              <select style={s.input} value={form.operatore_id||''} onChange={e=>setForm(f=>({...f,operatore_id:e.target.value}))}>
                {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Sala</label>
              <select style={s.input} value={form.sala||'Sala Colloqui'} onChange={e=>setForm(f=>({...f,sala:e.target.value}))}>
                {SALE.map(sl=><option key={sl}>{sl}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Data</label>
              <input type="date" style={s.input} value={form.data||''} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}>
                <label style={s.label}>Dalle</label>
                <input type="time" style={s.input} value={form.ora_inizio||'09:00'} onChange={e=>setForm(f=>({...f,ora_inizio:e.target.value}))}/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Alle</label>
                <input type="time" style={s.input} value={form.ora_fine||'10:00'} onChange={e=>setForm(f=>({...f,ora_fine:e.target.value}))}/>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Note</label>
              <textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
              <button style={s.btnSecondary} onClick={()=>setShowModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveAppt}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap: { maxWidth: 1080, margin: '0 auto' },
  topbar: { display:'flex', alignItems:'center', gap:8, marginBottom:'1rem', flexWrap:'wrap' },
  title: { fontSize:20, fontWeight:600, color:'#1a1a1a', flex:1, margin:0 },
  navWeek: { display:'flex', alignItems:'center', gap:6 },
  navBtn: { background:'#fff', border:'0.5px solid #d8d5ce', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14, color:'#333' },
  weekLabel: { fontSize:13, color:'#888', minWidth:140, textAlign:'center' },
  select: { padding:'7px 10px', border:'0.5px solid #d8d5ce', borderRadius:8, fontSize:13, background:'#fff', color:'#1a1a1a' },
  btnPrimary: { background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, cursor:'pointer', fontWeight:500 },
  btnSecondary: { background:'#fff', color:'#333', border:'0.5px solid #d8d5ce', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer' },
  btnSmall: { background:'#fff', border:'0.5px solid #d8d5ce', borderRadius:6, padding:'5px 12px', fontSize:12, cursor:'pointer', color:'#333' },
  legend: { display:'flex', gap:12, flexWrap:'wrap', marginBottom:'1rem' },
  legItem: { display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#888' },
  legDot: { width:10, height:10, borderRadius:2 },
  calWrap: { overflowX:'auto', background:'#fff', border:'0.5px solid #e8e5e0', borderRadius:12, overflow:'hidden' },
  cal: { minWidth:540 },
  grid: { display:'grid', gridTemplateColumns:'48px repeat(5,1fr)' },
  timeCol: { borderRight:'0.5px solid #e8e5e0' },
  dayHead: { padding:'8px 6px', textAlign:'center', fontSize:12, color:'#888', borderRight:'0.5px solid #e8e5e0' },
  dayHeadToday: { color:'#1a3a5c', fontWeight:600 },
  timeLabel: { padding:'0 8px', fontSize:11, color:'#aaa', height:48, display:'flex', alignItems:'flex-start', paddingTop:4, borderRight:'0.5px solid #e8e5e0' },
  dayCell: { borderRight:'0.5px solid #f0ede8', height:48, cursor:'pointer' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.18)', zIndex:20 },
  modal: { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', border:'0.5px solid #e8e5e0', borderRadius:14, padding:'1.5rem', zIndex:30, width:'min(480px,96vw)', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 },
  badge: { display:'inline-block', fontSize:11, padding:'2px 8px', borderRadius:20 },
  closeBtn: { background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#aaa' },
  dl: { fontSize:12, color:'#aaa', marginTop:8, marginBottom:2 },
  dv: { fontSize:14, color:'#1a1a1a' },
  field: { display:'flex', flexDirection:'column', gap:4 },
  label: { fontSize:12, color:'#888' },
  input: { padding:'8px 10px', border:'0.5px solid #d8d5ce', borderRadius:8, fontSize:13, background:'#fafaf8', color:'#1a1a1a', outline:'none', width:'100%' },
  suggest: { border:'0.5px solid #d8d5ce', borderRadius:8, background:'#fff', maxHeight:140, overflowY:'auto' },
  suggestItem: { padding:'8px 10px', fontSize:13, cursor:'pointer', borderBottom:'0.5px solid #f0ede8' },
}
