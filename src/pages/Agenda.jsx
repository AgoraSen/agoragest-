// src/pages/Agenda.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPI = ['colloquio','formazione','riunione','altro']
const TIPO_LABEL = { colloquio:'Colloquio', formazione:'Formazione', riunione:'Riunione', altro:'Altro' }
const TIPO_COLOR = { colloquio:'#B5D4F4', formazione:'#CECBF6', riunione:'#9FE1CB', altro:'#D3D1C7' }
const TIPO_TEXT = { colloquio:'#0C447C', formazione:'#3C3489', riunione:'#085041', altro:'#444441' }
const GIORNI = ['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì']
const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
const H_START = 8

export default function Agenda() {
  const { profile, can } = useAuth()
  const [tab, setTab] = useState('calendario')
  const [appuntamenti, setAppuntamenti] = useState([])
  const [candidati, setCandidati] = useState([])
  const [operatori, setOperatori] = useState([])
  const [sale, setSale] = useState([])
  const [disponibilita, setDisponibilita] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [filterOp, setFilterOp] = useState('')
  const [filterSala, setFilterSala] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [candSearch, setCandSearch] = useState('')
  const [candSuggests, setCandSuggests] = useState([])
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [nuovaSala, setNuovaSala] = useState('')
  const [dispForm, setDispForm] = useState({ tipo:'ricorrente', giorno_settimana:1, data_specifica:'', ora_inizio:'09:00', ora_fine:'17:00' })
  const [dispOpFilter, setDispOpFilter] = useState('')

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadAppuntamenti() }, [weekOffset, filterOp, filterSala])

  async function loadAll() {
    await Promise.all([loadOperatori(), loadCandidati(), loadSale(), loadDisponibilita()])
  }

  async function loadOperatori() {
    const { data } = await supabase.from('profiles').select('id,nome,cognome').eq('attivo',true)
    setOperatori(data||[])
  }

  async function loadCandidati() {
    const { data } = await supabase.from('candidati').select('id,nome,cognome,tel').order('cognome').limit(500)
    setCandidati(data||[])
  }

  async function loadSale() {
    const { data } = await supabase.from('sale').select('*').order('nome')
    setSale(data||[])
  }

  async function loadDisponibilita() {
    const { data } = await supabase.from('disponibilita').select('*, profiles(nome,cognome)').eq('attiva',true).order('created_at')
    setDisponibilita(data||[])
  }

  async function loadAppuntamenti() {
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
    if (filterSala) q = q.eq('sala', filterSala)
    const { data } = await q
    setAppuntamenti(data||[])
  }

  async function checkConflictFor(sala, data, oraInizio, oraFine, excludeId, operatoreId, candidatoId) {
    if (!data || !oraInizio || !oraFine) return []
    const { data: appts } = await supabase
      .from('appuntamenti')
      .select('id,titolo,ora_inizio,ora_fine,sala,operatore_id,candidato_id,profiles(nome,cognome),candidati(nome,cognome)')
      .eq('data', data).eq('stato','attivo')
    const warnings = []
    const overlaps = a => {
      if (a.id === excludeId) return false
      const aS = timeToMin(a.ora_inizio?.slice(0,5))
      const aE = timeToMin(a.ora_fine?.slice(0,5))
      const fS = timeToMin(oraInizio)
      const fE = timeToMin(oraFine)
      return fS < aE && fE > aS
    }
    // 1. Sala occupata
    if (sala) {
      const salaBusy = (appts||[]).filter(a => a.sala === sala && overlaps(a))
      if (salaBusy.length > 0) warnings.push({ tipo:'sala', msg:`Sala "${sala}" già occupata: ${salaBusy[0].titolo} ${salaBusy[0].ora_inizio?.slice(0,5)}–${salaBusy[0].ora_fine?.slice(0,5)}` })
    }
    // 2. Operatore già occupato
    if (operatoreId) {
      const opBusy = (appts||[]).filter(a => a.operatore_id === operatoreId && overlaps(a))
      if (opBusy.length > 0) {
        const op = opBusy[0].profiles
        warnings.push({ tipo:'operatore', msg:`Operatore già occupato: ${opBusy[0].titolo} ${opBusy[0].ora_inizio?.slice(0,5)}–${opBusy[0].ora_fine?.slice(0,5)}` })
      }
    }
    // 3. Candidato già occupato
    if (candidatoId) {
      const candBusy = (appts||[]).filter(a => a.candidato_id === candidatoId && overlaps(a))
      if (candBusy.length > 0) {
        warnings.push({ tipo:'candidato', msg:`Candidato già in un appuntamento: ${candBusy[0].titolo} ${candBusy[0].ora_inizio?.slice(0,5)}–${candBusy[0].ora_fine?.slice(0,5)}` })
      }
    }
    return warnings
  }

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
  function timeToMin(t) { if(!t)return 0; const[h,m]=(t||'00:00').split(':').map(Number); return h*60+m }

  function openNew(date, hour) {
    setEditId(null); setCandSearch(''); setCandSuggests([]); setConflict(null)
    setForm({ tipo:'colloquio', titolo:'', candidato_id:null, operatore_id:profile.id,
      sala: sale.find(s=>s.attiva)?.nome || '', data:date,
      ora_inizio:hour, ora_fine:String(parseInt(hour)+1).padStart(2,'0')+':00', note:'' })
    setShowModal(true)
  }

  function openEdit(a) {
    setEditId(a.id); setCandSearch(a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:'')
    setCandSuggests([]); setConflict(null)
    setForm({ tipo:a.tipo, titolo:a.titolo, candidato_id:a.candidato_id, operatore_id:a.operatore_id,
      sala:a.sala, data:a.data, ora_inizio:a.ora_inizio?.slice(0,5), ora_fine:a.ora_fine?.slice(0,5), note:a.note||'' })
    setShowDetail(false); setShowModal(true)
  }

  async function handleFormChange(updates) {
    const newForm = { ...form, ...updates }
    setForm(newForm)
    if (newForm.data && newForm.ora_inizio && newForm.ora_fine) {
      const w = await checkConflictFor(newForm.sala, newForm.data, newForm.ora_inizio, newForm.ora_fine, editId, newForm.operatore_id, newForm.candidato_id)
      setConflict(w)
    }
  }

  async function saveAppt() {
    if (!form.titolo && !form.candidato_id) return
    const cand = candidati.find(c=>c.id===form.candidato_id)
    const titolo = form.titolo || (cand?`${cand.nome} ${cand.cognome}`:'')
    if (editId) {
      await supabase.from('appuntamenti').update({...form,titolo}).eq('id',editId)
    } else {
      await supabase.from('appuntamenti').insert([{...form,titolo}])
      if (form.candidato_id && form.tipo==='colloquio') {
        const { data:c } = await supabase.from('candidati').select('stato').eq('id',form.candidato_id).single()
        if (c?.stato==='In attesa') await supabase.from('candidati').update({stato:'Colloquio fissato'}).eq('id',form.candidato_id)
      }
    }
    setShowModal(false); setConflict(null); loadAppuntamenti()
  }

  async function cancelAppt(id) {
    if (!window.confirm('Annullare questo appuntamento?')) return
    await supabase.from('appuntamenti').update({stato:'cancellato'}).eq('id',id)
    setShowDetail(false); loadAppuntamenti()
  }

  function searchCand(q) {
    setCandSearch(q)
    if (!q) { setCandSuggests([]); return }
    setCandSuggests(candidati.filter(c=>(c.nome+' '+c.cognome).toLowerCase().includes(q.toLowerCase())).slice(0,6))
  }

  function selectCand(c) {
    setForm(f=>({...f,candidato_id:c.id,titolo:`${c.nome} ${c.cognome}`}))
    setCandSearch(`${c.nome} ${c.cognome}`); setCandSuggests([])
  }

  async function addSala() {
    if (!nuovaSala.trim()) return
    await supabase.from('sale').insert([{nome:nuovaSala.trim()}])
    setNuovaSala(''); loadSale()
  }

  async function toggleSala(id, attiva) {
    await supabase.from('sale').update({attiva:!attiva}).eq('id',id); loadSale()
  }

  async function saveDisp() {
    const payload = {
      operatore_id: can.viewAll && dispOpFilter ? dispOpFilter : profile.id,
      tipo: dispForm.tipo,
      giorno_settimana: dispForm.tipo==='ricorrente' ? parseInt(dispForm.giorno_settimana) : null,
      data_specifica: dispForm.tipo==='giorno_specifico' ? dispForm.data_specifica : null,
      ora_inizio: dispForm.ora_inizio, ora_fine: dispForm.ora_fine,
    }
    await supabase.from('disponibilita').insert([payload]); loadDisponibilita()
  }

  async function deleteDisp(id) {
    await supabase.from('disponibilita').update({attiva:false}).eq('id',id); loadDisponibilita()
  }

  function getDispForOpDate(opId, dateStr) {
    if (!dateStr) return []
    const date = new Date(dateStr); const dow = date.getDay()||7
    return disponibilita.filter(d => d.operatore_id===opId && (
      (d.tipo==='ricorrente'&&d.giorno_settimana===dow) ||
      (d.tipo==='giorno_specifico'&&d.data_specifica===dateStr)
    ))
  }

  const days = weekDays(weekOffset)
  const weekLabel = `${fmtShort(days[0])} – ${fmtShort(days[4])}`
  const todayStr = fmtDate(new Date())

  // Occupazione sale per tab Sale (carica tutti gli appuntamenti di oggi)
  const [apptOggi, setApptOggi] = useState([])
  useEffect(() => {
    supabase.from('appuntamenti').select('*,profiles(nome,cognome)').eq('data',todayStr).eq('stato','attivo').order('ora_inizio').then(({data})=>setApptOggi(data||[]))
  }, [tab])

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Agenda</h2>
        <div style={s.navWeek}>
          <button style={s.navBtn} onClick={()=>setWeekOffset(w=>w-1)}>‹</button>
          <span style={s.weekLabel}>{weekLabel}</span>
          <button style={s.navBtn} onClick={()=>setWeekOffset(w=>w+1)}>›</button>
        </div>
        <button style={s.btnSecondary} onClick={()=>setWeekOffset(0)}>Oggi</button>
      </div>

      <div style={s.tabRow}>
        {[['calendario','Calendario'],['sale','Sale'],['disponibilita','Disponibilità']].map(([id,label])=>(
          <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
        ))}
        <div style={{flex:1}}/>
        {tab==='calendario' && <>
          <select style={s.select} value={filterOp} onChange={e=>setFilterOp(e.target.value)}>
            <option value="">Tutti gli operatori</option>
            {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
          </select>
          <select style={s.select} value={filterSala} onChange={e=>setFilterSala(e.target.value)}>
            <option value="">Tutte le sale</option>
            {sale.filter(s=>s.attiva).map(s=><option key={s.id}>{s.nome}</option>)}
          </select>
        </>}
        <button style={s.btnPrimary} onClick={()=>openNew(fmtDate(new Date()),'09:00')}>+ Appuntamento</button>
      </div>

      {/* CALENDARIO */}
      {tab==='calendario' && (
        <>
          <div style={s.legend}>
            {TIPI.map(t=>(
              <div key={t} style={s.legItem}><div style={{...s.legDot,background:TIPO_COLOR[t]}}/>{TIPO_LABEL[t]}</div>
            ))}
          </div>
          <div style={s.calOuter}>
            <div style={s.cal}>
              <div style={{display:'grid',gridTemplateColumns:'48px repeat(5,1fr)',background:'#fafaf8',borderBottom:'0.5px solid #e8e5e0'}}>
                <div style={{borderRight:'0.5px solid #e8e5e0'}}/>
                {days.map((d,i)=>(
                  <div key={i} style={{...s.dayHead,...(isToday(d)?s.dayHeadToday:{})}}>
                    <span style={{fontSize:18,fontWeight:600,display:'block'}}>{d.getDate()}</span>
                    {d.toLocaleDateString('it-IT',{weekday:'short'})}
                  </div>
                ))}
              </div>
              <div style={{position:'relative'}}>
                {HOURS.map(h=>(
                  <div key={h} style={{display:'grid',gridTemplateColumns:'48px repeat(5,1fr)'}}>
                    <div style={s.timeLabel}>{h}</div>
                    {days.map((d,di)=>(
                      <div key={di} style={s.dayCell} onClick={()=>openNew(fmtDate(d),h)}/>
                    ))}
                  </div>
                ))}
                {/* Rendering eventi con affiancamento sovrapposti */}
                {days.map((d, dayIdx) => {
                  const dateStr = fmtDate(d)
                  const dayAppts = appuntamenti.filter(a => a.data === dateStr)
                  // Calcola colonne per affiancamento
                  const cols = []
                  dayAppts.forEach(a => {
                    const aS = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
                    const aE = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
                    let placed = false
                    for (let ci = 0; ci < cols.length; ci++) {
                      const last = cols[ci][cols[ci].length-1]
                      const lE = timeToMin(last.ora_fine?.slice(0,5)||'10:00')
                      if (aS >= lE) { cols[ci].push(a); placed = true; break }
                    }
                    if (!placed) cols.push([a])
                  })
                  const totalCols = cols.length || 1
                  const MAX_VISIBLE = 3
                  return dayAppts.map(a => {
                    const colIdx = cols.findIndex(col => col.includes(a))
                    const sMin = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
                    const eMin = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
                    const top = (sMin - H_START*60)/60*48
                    const ht = Math.max((eMin-sMin)/60*48-2, 18)
                    // Se troppe colonne, mostra badge +N sull'ultima visibile
                    if (colIdx >= MAX_VISIBLE) return null
                    const isLast = colIdx === MAX_VISIBLE-1 && totalCols > MAX_VISIBLE
                    const extraCount = totalCols - MAX_VISIBLE
                    const colW = `calc((100% - 48px)/${5 * Math.min(totalCols, MAX_VISIBLE)})`
                    const leftOffset = `calc(48px + ${dayIdx}*(100% - 48px)/5 + ${colIdx}*(100% - 48px)/${5 * Math.min(totalCols, MAX_VISIBLE)} + 1px)`
                    return (
                      <div key={a.id} style={{
                        position:'absolute', top, height:ht,
                        left: leftOffset,
                        width: `calc((100% - 48px)/${5 * Math.min(totalCols, MAX_VISIBLE)} - 2px)`,
                        background:TIPO_COLOR[a.tipo]||'#D3D1C7', color:TIPO_TEXT[a.tipo]||'#444',
                        borderRadius:4, padding:'2px 5px', fontSize:11, cursor:'pointer', overflow:'hidden', zIndex:2+colIdx,
                      }} onClick={e=>{e.stopPropagation();setSelectedAppt(a);setShowDetail(true)}}>
                        <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:a.titolo}
                        </div>
                        {ht>28&&<div style={{opacity:.9,fontSize:10}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</div>}
                        {ht>42&&<div style={{opacity:.85,fontSize:10}}>{a.sala}</div>}
                        {ht>56&&a.profiles&&<div style={{opacity:.85,fontSize:10}}>{a.profiles.nome} {a.profiles.cognome}</div>}
                        {isLast && extraCount > 0 && (
                          <div style={{position:'absolute',bottom:2,right:3,background:'rgba(0,0,0,0.2)',borderRadius:4,padding:'1px 4px',fontSize:10,fontWeight:600}}>
                            +{extraCount}
                          </div>
                        )}
                      </div>
                    )
                  })
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* SALE */}
      {tab==='sale' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
            <span style={{fontSize:13,color:'#888'}}>
              Occupazione sale — oggi {new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}
            </span>
            {can.manageUsers&&(
              <div style={{display:'flex',gap:8}}>
                <input style={{...s.input,width:200}} placeholder="Nome nuova sala..." value={nuovaSala}
                  onChange={e=>setNuovaSala(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSala()}/>
                <button style={s.btnPrimary} onClick={addSala}>+ Aggiungi</button>
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:'1.5rem'}}>
            {sale.map(sala=>{
              const appts=apptOggi.filter(a=>a.sala===sala.nome)
              const nowMin=new Date().getHours()*60+new Date().getMinutes()
              const inUso=sala.attiva&&appts.some(a=>timeToMin(a.ora_inizio?.slice(0,5))<=nowMin&&timeToMin(a.ora_fine?.slice(0,5))>nowMin)
              const occCorrente=appts.find(a=>timeToMin(a.ora_inizio?.slice(0,5))<=nowMin&&timeToMin(a.ora_fine?.slice(0,5))>nowMin)
              return(
                <div key={sala.id} style={{...s.card,opacity:sala.attiva?1:.5,borderLeft:`3px solid ${inUso?'#E24B4A':sala.attiva?'#1D9E75':'#B4B2A9'}`}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontSize:15,fontWeight:600,color:'#1a1a1a'}}>{sala.nome}</div>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,
                      background:!sala.attiva?'#F1EFE8':inUso?'#FCEBEB':'#EAF3DE',
                      color:!sala.attiva?'#888':inUso?'#791F1F':'#27500A'}}>
                      {!sala.attiva?'Disattivata':inUso?'Occupata':'Libera'}
                    </span>
                  </div>
                  {inUso&&occCorrente&&(
                    <div style={{fontSize:12,color:'#791F1F',marginBottom:6,fontWeight:500}}>
                      In uso: {occCorrente.titolo} fino alle {occCorrente.ora_fine?.slice(0,5)}
                      {occCorrente.profiles&&` (${occCorrente.profiles.nome})`}
                    </div>
                  )}
                  <div style={{fontSize:12,color:'#888',marginBottom:appts.length?6:0}}>
                    {appts.length} appuntament{appts.length===1?'o':'i'} oggi
                  </div>
                  {appts.sort((a,b)=>a.ora_inizio>b.ora_inizio?1:-1).map(a=>(
                    <div key={a.id} style={{fontSize:12,padding:'3px 0',borderTop:'0.5px solid #f5f3ee',display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{color:'#1a3a5c',fontWeight:500,whiteSpace:'nowrap',minWidth:90}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</span>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#333'}}>{a.titolo}</span>
                      {a.profiles&&<span style={{color:'#aaa',fontSize:11,whiteSpace:'nowrap'}}>{a.profiles.nome?.charAt(0)}.{a.profiles.cognome}</span>}
                    </div>
                  ))}
                  {can.manageUsers&&(
                    <button style={{...s.btnSmall,marginTop:8,color:sala.attiva?'#b91c1c':'#27500A',fontSize:11}}
                      onClick={()=>toggleSala(sala.id,sala.attiva)}>
                      {sala.attiva?'Disattiva sala':'Riattiva sala'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DISPONIBILITÀ */}
      {tab==='disponibilita' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
          <div>
            <div style={s.sectionLabel}>Aggiungi fascia oraria</div>
            {can.viewAll&&(
              <div style={s.field}>
                <label style={s.label}>Operatore</label>
                <select style={s.input} value={dispOpFilter} onChange={e=>setDispOpFilter(e.target.value)}>
                  <option value="">— me stesso —</option>
                  {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
                </select>
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>Tipo di disponibilità</label>
              <select style={s.input} value={dispForm.tipo} onChange={e=>setDispForm(f=>({...f,tipo:e.target.value}))}>
                <option value="ricorrente">Ricorrente — ogni settimana</option>
                <option value="giorno_specifico">Giorno specifico</option>
              </select>
            </div>
            {dispForm.tipo==='ricorrente'
              ?<div style={s.field}>
                <label style={s.label}>Giorno della settimana</label>
                <select style={s.input} value={dispForm.giorno_settimana} onChange={e=>setDispForm(f=>({...f,giorno_settimana:e.target.value}))}>
                  {[1,2,3,4,5].map(d=><option key={d} value={d}>{GIORNI[d]}</option>)}
                </select>
              </div>
              :<div style={s.field}>
                <label style={s.label}>Data</label>
                <input type="date" style={s.input} value={dispForm.data_specifica} onChange={e=>setDispForm(f=>({...f,data_specifica:e.target.value}))}/>
              </div>
            }
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Dalle</label>
                <input type="time" style={s.input} value={dispForm.ora_inizio} onChange={e=>setDispForm(f=>({...f,ora_inizio:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Alle</label>
                <input type="time" style={s.input} value={dispForm.ora_fine} onChange={e=>setDispForm(f=>({...f,ora_fine:e.target.value}))}/>
              </div>
            </div>
            <button style={{...s.btnPrimary,marginTop:10}} onClick={saveDisp}>Salva disponibilità</button>
          </div>
          <div>
            <div style={s.sectionLabel}>Disponibilità impostate</div>
            {can.viewAll&&(
              <select style={{...s.input,marginBottom:12}} value={dispOpFilter} onChange={e=>setDispOpFilter(e.target.value)}>
                <option value="">Tutti gli operatori</option>
                {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
              </select>
            )}
            {disponibilita.filter(d=>!dispOpFilter||d.operatore_id===dispOpFilter).map(d=>(
              <div key={d.id} style={{...s.card,marginBottom:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{d.profiles?.nome} {d.profiles?.cognome}</div>
                  <div style={{fontSize:12,color:'#888',marginTop:2}}>
                    {d.tipo==='ricorrente'?`Ogni ${GIORNI[d.giorno_settimana]}`:`Il ${fmtIt(d.data_specifica)}`}
                    {' — '}{d.ora_inizio?.slice(0,5)}–{d.ora_fine?.slice(0,5)}
                  </div>
                </div>
                <button style={{...s.btnSmall,color:'#b91c1c',fontSize:11}} onClick={()=>deleteDisp(d.id)}>Rimuovi</button>
              </div>
            ))}
            {disponibilita.filter(d=>!dispOpFilter||d.operatore_id===dispOpFilter).length===0&&
              <div style={{fontSize:13,color:'#aaa'}}>Nessuna disponibilità impostata.</div>
            }
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail&&selectedAppt&&(
        <>
          <div style={s.overlay} onClick={()=>setShowDetail(false)}/>
          <div style={s.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:TIPO_COLOR[selectedAppt.tipo],color:TIPO_TEXT[selectedAppt.tipo]}}>
                {TIPO_LABEL[selectedAppt.tipo]}
              </span>
              <button style={s.closeBtn} onClick={()=>setShowDetail(false)}>✕</button>
            </div>
            <div style={{fontSize:17,fontWeight:600,color:'#1a1a1a',margin:'8px 0'}}>{selectedAppt.titolo}</div>
            <div style={s.dl}>Candidato</div>
            <div style={s.dv}>{selectedAppt.candidati?`${selectedAppt.candidati.nome} ${selectedAppt.candidati.cognome}`:'—'}</div>
            <div style={s.dl}>Operatore</div>
            <div style={s.dv}>{selectedAppt.profiles?`${selectedAppt.profiles.nome} ${selectedAppt.profiles.cognome}`:'—'}</div>
            <div style={s.dl}>Sala</div><div style={s.dv}>{selectedAppt.sala||'—'}</div>
            <div style={s.dl}>Orario</div>
            <div style={s.dv}>{fmtIt(selectedAppt.data)} · {selectedAppt.ora_inizio?.slice(0,5)}–{selectedAppt.ora_fine?.slice(0,5)}</div>
            {selectedAppt.note&&<><div style={s.dl}>Note</div><div style={s.dv}>{selectedAppt.note}</div></>}
            <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}>
              <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>cancelAppt(selectedAppt.id)}>Annulla appuntamento</button>
              <button style={s.btnSecondary} onClick={()=>openEdit(selectedAppt)}>Modifica</button>
              <button style={s.btnPrimary} onClick={()=>setShowDetail(false)}>Chiudi</button>
            </div>
          </div>
        </>
      )}

      {/* New/Edit modal */}
      {showModal&&(
        <>
          <div style={s.overlay} onClick={()=>{setShowModal(false);setConflict(null)}}/>
          <div style={s.modal}>
            <h3 style={{fontSize:16,fontWeight:600,color:'#1a1a1a',margin:0}}>{editId?'Modifica':'Nuovo appuntamento'}</h3>
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={form.tipo||'colloquio'} onChange={e=>handleFormChange({tipo:e.target.value})}>
                {TIPI.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Candidato (opzionale)</label>
              <input style={s.input} placeholder="Cerca nome..." value={candSearch} onChange={e=>searchCand(e.target.value)}/>
              {candSuggests.length>0&&(
                <div style={s.suggest}>
                  {candSuggests.map(c=>(
                    <div key={c.id} style={s.suggestItem} onMouseDown={()=>selectCand(c)}>
                      {c.nome} {c.cognome} <span style={{color:'#aaa',fontSize:11}}>{c.tel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={s.field}><label style={s.label}>Titolo</label>
              <input style={s.input} value={form.titolo||''} onChange={e=>handleFormChange({titolo:e.target.value})} placeholder="Es. Riunione settimanale"/>
            </div>
            <div style={s.field}><label style={s.label}>Operatore</label>
              <select style={s.input} value={form.operatore_id||''} onChange={e=>handleFormChange({operatore_id:e.target.value})}>
                {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Sala</label>
              <select style={s.input} value={form.sala||''} onChange={e=>handleFormChange({sala:e.target.value})}>
                {sale.filter(sl=>sl.attiva).map(sl=><option key={sl.id}>{sl.nome}</option>)}
              </select>
            </div>
            {conflict && conflict.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {conflict.map((w,i) => (
                  <div key={i} style={{background:'#FCEBEB',border:'0.5px solid #E24B4A',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#791F1F'}}>
                    ⚠️ <strong>{w.tipo==='sala'?'Sala occupata':w.tipo==='operatore'?'Operatore occupato':'Candidato già prenotato'}:</strong> {w.msg}
                  </div>
                ))}
              </div>
            )}
            <div style={s.field}><label style={s.label}>Data</label>
              <input type="date" style={s.input} value={form.data||''} onChange={e=>handleFormChange({data:e.target.value})}/>
            </div>
            {form.operatore_id&&form.data&&getDispForOpDate(form.operatore_id,form.data).length>0&&(
              <div style={{background:'#EAF3DE',border:'0.5px solid #27500A',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#27500A'}}>
                ✓ Disponibilità operatore: {getDispForOpDate(form.operatore_id,form.data).map(d=>`${d.ora_inizio?.slice(0,5)}–${d.ora_fine?.slice(0,5)}`).join(', ')}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Dalle</label>
                <input type="time" style={s.input} value={form.ora_inizio||'09:00'} onChange={e=>handleFormChange({ora_inizio:e.target.value})}/>
              </div>
              <div style={s.field}><label style={s.label}>Alle</label>
                <input type="time" style={s.input} value={form.ora_fine||'10:00'} onChange={e=>handleFormChange({ora_fine:e.target.value})}/>
              </div>
            </div>
            <div style={s.field}><label style={s.label}>Note</label>
              <textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
              <button style={s.btnSecondary} onClick={()=>{setShowModal(false);setConflict(null)}}>Annulla</button>
              <button style={{...s.btnPrimary,...(conflict&&conflict.length>0?{background:'#e05a00',borderColor:'#e05a00'}:{})}} onClick={saveAppt}>
                {conflict&&conflict.length>0?'Salva comunque':'Salva'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap:{maxWidth:1100,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem',flexWrap:'wrap'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  navWeek:{display:'flex',alignItems:'center',gap:6},
  navBtn:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:14,color:'#333'},
  weekLabel:{fontSize:13,color:'#888',minWidth:140,textAlign:'center'},
  tabRow:{display:'flex',gap:4,marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'},
  tab:{padding:'5px 16px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:13,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  select:{padding:'7px 10px',border:'0.5px solid #d8d5ce',borderRadius:8,fontSize:13,background:'#fff',color:'#1a1a1a'},
  legend:{display:'flex',gap:12,flexWrap:'wrap',marginBottom:'1rem'},
  legItem:{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#888'},
  legDot:{width:10,height:10,borderRadius:2},
  calOuter:{overflowX:'auto',background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,overflow:'hidden'},
  cal:{minWidth:540},
  dayHead:{padding:'8px 6px',textAlign:'center',fontSize:12,color:'#888',borderRight:'0.5px solid #e8e5e0'},
  dayHeadToday:{color:'#1a3a5c',fontWeight:600},
  timeLabel:{padding:'0 8px',fontSize:11,color:'#aaa',height:48,display:'flex',alignItems:'flex-start',paddingTop:4,borderRight:'0.5px solid #e8e5e0'},
  dayCell:{borderRight:'0.5px solid #f0ede8',height:48,cursor:'pointer'},
  card:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1rem 1.25rem'},
  sectionLabel:{fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:10},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:20},
  modal:{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:14,padding:'1.5rem',zIndex:30,width:'min(500px,96vw)',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10},
  dl:{fontSize:12,color:'#aaa',marginTop:8,marginBottom:2},
  dv:{fontSize:14,color:'#1a1a1a'},
  field:{display:'flex',flexDirection:'column',gap:4},
  label:{fontSize:12,color:'#888'},
  input:{padding:'8px 10px',border:'0.5px solid #d8d5ce',borderRadius:8,fontSize:13,background:'#fafaf8',color:'#1a1a1a',outline:'none',width:'100%'},
  suggest:{border:'0.5px solid #d8d5ce',borderRadius:8,background:'#fff',maxHeight:140,overflowY:'auto'},
  suggestItem:{padding:'8px 10px',fontSize:13,cursor:'pointer',borderBottom:'0.5px solid #f0ede8'},
  closeBtn:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#aaa'},
  btnPrimary:{background:'#1a3a5c',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,cursor:'pointer',fontWeight:500},
  btnSecondary:{background:'#fff',color:'#333',border:'0.5px solid #d8d5ce',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'},
  btnSmall:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#333'},
}
 
