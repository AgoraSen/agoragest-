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
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const VIEWS = [
  {id:'giorno', label:'Giorno'},
  {id:'settimana', label:'Settimana'},
  {id:'mese', label:'Mese'},
  {id:'trimestre', label:'Trimestre'},
  {id:'anno', label:'Anno'},
]

export default function Agenda() {
  const { profile, can } = useAuth()
  const [view, setView] = useState('settimana')
  const [tab, setTab] = useState('calendario')
  const [appuntamenti, setAppuntamenti] = useState([])
  const [candidati, setCandidati] = useState([])
  const [operatori, setOperatori] = useState([])
  const [sale, setSale] = useState([])
  const [disponibilita, setDisponibilita] = useState([])
  const [offset, setOffset] = useState(0)
  const [filterOp, setFilterOp] = useState('')
  const [filterSala, setFilterSala] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDayPopup, setShowDayPopup] = useState(false)
  const [dayPopupAppts, setDayPopupAppts] = useState([])
  const [dayPopupDate, setDayPopupDate] = useState('')
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [candSearch, setCandSearch] = useState('')
  const [candSuggests, setCandSuggests] = useState([])
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [nuovaSala, setNuovaSala] = useState('')
  const [dispForm, setDispForm] = useState({ tipo:'ricorrente', giorno_settimana:1, data_specifica:'', ora_inizio:'09:00', ora_fine:'17:00' })
  const [dispOpFilter, setDispOpFilter] = useState('')
  const [apptOggi, setApptOggi] = useState([])

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadAppuntamenti() }, [offset, view, filterOp, filterSala])

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

  function getRange() {
    const today = new Date(); today.setHours(0,0,0,0)
    if (view === 'giorno') {
      const d = new Date(today); d.setDate(d.getDate() + offset)
      return { from: fmtDate(d), to: fmtDate(d) }
    }
    if (view === 'settimana') {
      const days = weekDays(offset)
      return { from: fmtDate(days[0]), to: fmtDate(days[4]) }
    }
    if (view === 'mese') {
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
      const last = new Date(d.getFullYear(), d.getMonth()+1, 0)
      return { from: fmtDate(d), to: fmtDate(last) }
    }
    if (view === 'trimestre') {
      const q = Math.floor(today.getMonth()/3) + offset
      const year = today.getFullYear() + Math.floor(q/4)
      const qNorm = ((q % 4) + 4) % 4
      const from = new Date(year, qNorm*3, 1)
      const to = new Date(year, qNorm*3+3, 0)
      return { from: fmtDate(from), to: fmtDate(to) }
    }
    if (view === 'anno') {
      const year = today.getFullYear() + offset
      return { from: `${year}-01-01`, to: `${year}-12-31` }
    }
    return { from: fmtDate(today), to: fmtDate(today) }
  }

  function getRangeLabel() {
    const today = new Date(); today.setHours(0,0,0,0)
    if (view === 'giorno') {
      const d = new Date(today); d.setDate(d.getDate() + offset)
      return d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    }
    if (view === 'settimana') {
      const days = weekDays(offset)
      return `${fmtShort(days[0])} – ${fmtShort(days[4])}`
    }
    if (view === 'mese') {
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
      return `${MESI[d.getMonth()]} ${d.getFullYear()}`
    }
    if (view === 'trimestre') {
      const q = Math.floor(today.getMonth()/3) + offset
      const year = today.getFullYear() + Math.floor(q/4)
      const qNorm = ((q % 4) + 4) % 4
      return `T${qNorm+1} ${year}`
    }
    if (view === 'anno') {
      return String(today.getFullYear() + offset)
    }
    return ''
  }

  async function loadAppuntamenti() {
    const { from, to } = getRange()
    const todayStr = fmtDate(new Date())
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
    // Carica anche oggi per tab Sale
    const { data: oggi } = await supabase.from('appuntamenti').select('*,profiles(nome,cognome)').eq('data',todayStr).eq('stato','attivo').order('ora_inizio')
    setApptOggi(oggi||[])
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
    if (sala) {
      const salaBusy = (appts||[]).filter(a => a.sala === sala && overlaps(a))
      if (salaBusy.length > 0) warnings.push({ tipo:'sala', msg:`Sala "${sala}" già occupata: ${salaBusy[0].titolo} ${salaBusy[0].ora_inizio?.slice(0,5)}–${salaBusy[0].ora_fine?.slice(0,5)}` })
    }
    if (operatoreId) {
      const opBusy = (appts||[]).filter(a => a.operatore_id === operatoreId && overlaps(a))
      if (opBusy.length > 0) warnings.push({ tipo:'operatore', msg:`Operatore già occupato: ${opBusy[0].titolo} ${opBusy[0].ora_inizio?.slice(0,5)}–${opBusy[0].ora_fine?.slice(0,5)}` })
    }
    if (candidatoId) {
      const candBusy = (appts||[]).filter(a => a.candidato_id === candidatoId && overlaps(a))
      if (candBusy.length > 0) warnings.push({ tipo:'candidato', msg:`Candidato già in un appuntamento: ${candBusy[0].titolo} ${candBusy[0].ora_inizio?.slice(0,5)}–${candBusy[0].ora_fine?.slice(0,5)}` })
    }
    return warnings
  }

  function weekDays(off) {
    const d = new Date(); d.setHours(0,0,0,0)
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1 + off * 7)
    return Array.from({length:5}, (_,i) => { const r = new Date(d); r.setDate(d.getDate()+i); return r })
  }

  function fmtDate(d) {
    if (!(d instanceof Date)) return d
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`
  }
  function fmtShort(d) { return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'}) }
  function fmtIt(s) { if(!s)return '—'; const[y,m,dd]=s.split('-'); return `${dd}/${m}/${y}` }
  function isToday(d) { return fmtDate(d) === fmtDate(new Date()) }
  function isTodayStr(s) { return s === fmtDate(new Date()) }
  function timeToMin(t) { if(!t)return 0; const[h,m]=(t||'00:00').split(':').map(Number); return h*60+m }

  function openNew(date, hour) {
    setEditId(null); setCandSearch(''); setCandSuggests([]); setConflict(null)
    setForm({ tipo:'colloquio', titolo:'', candidato_id:null, operatore_id:profile.id,
      sala: sale.find(s=>s.attiva)?.nome || '', data: typeof date === 'string' ? date : fmtDate(date),
      ora_inizio:hour||'09:00', ora_fine:hour?String(parseInt(hour)+1).padStart(2,'0')+':00':'10:00', note:'' })
    setShowModal(true)
  }

  function openEdit(a) {
    setEditId(a.id); setCandSearch(a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:'')
    setCandSuggests([]); setConflict(null)
    setForm({ tipo:a.tipo, titolo:a.titolo, candidato_id:a.candidato_id, operatore_id:a.operatore_id,
      sala:a.sala, data:a.data, ora_inizio:a.ora_inizio?.slice(0,5), ora_fine:a.ora_fine?.slice(0,5), note:a.note||'' })
    setShowDetail(false); setShowDayPopup(false); setShowModal(true)
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
    setShowDetail(false); setShowDayPopup(false); loadAppuntamenti()
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
    const date = new Date(dateStr+'T12:00:00'); const dow = date.getDay()||7
    return disponibilita.filter(d => d.operatore_id===opId && (
      (d.tipo==='ricorrente'&&d.giorno_settimana===dow) ||
      (d.tipo==='giorno_specifico'&&d.data_specifica===dateStr)
    ))
  }

  // Rendering eventi con affiancamento (max 2 colonne, poi +N)
  function renderEvents(dayAppts, dayIdx, totalDays) {
    if (!dayAppts.length) return null
    const MAX_COLS = 2
    const sorted = [...dayAppts].sort((a,b) => timeToMin(a.ora_inizio?.slice(0,5)) - timeToMin(b.ora_inizio?.slice(0,5)))
    const colEnd = []
    const apptCol = new Map()
    sorted.forEach(a => {
      const aS = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
      const aE = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
      let placed = false
      for (let ci = 0; ci < colEnd.length; ci++) {
        if (aS >= colEnd[ci]) { apptCol.set(a.id, ci); colEnd[ci] = aE; placed = true; break }
      }
      if (!placed) { apptCol.set(a.id, colEnd.length); colEnd.push(aE) }
    })
    const totalCols = Math.min(colEnd.length, MAX_COLS)
    const dayFrac = 1/totalDays
    const colFrac = dayFrac / totalCols

    // Conta eventi nascosti per ogni slot orario
    const hiddenBySlot = new Map()
    sorted.forEach(a => {
      const col = apptCol.get(a.id) ?? 0
      if (col >= MAX_COLS) {
        const slotKey = a.ora_inizio?.slice(0,5)||'09:00'
        hiddenBySlot.set(slotKey, (hiddenBySlot.get(slotKey)||0)+1)
      }
    })

    const rendered = []
    const plusRendered = new Set()

    sorted.forEach(a => {
      const col = apptCol.get(a.id) ?? 0
      if (col >= MAX_COLS) return // nascosto
      const sMin = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
      const eMin = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
      const top = (sMin - H_START*60)/60*48
      const ht = Math.max((eMin-sMin)/60*48-2, 18)
      const slotKey = a.ora_inizio?.slice(0,5)||'09:00'
      const hidden = hiddenBySlot.get(slotKey)||0
      const showPlus = col === MAX_COLS-1 && hidden > 0 && !plusRendered.has(slotKey)
      if (showPlus) plusRendered.add(slotKey)
      const dayApptsFull = dayAppts.filter(x => x.ora_inizio?.slice(0,5) === slotKey || (timeToMin(x.ora_inizio?.slice(0,5)) <= sMin && timeToMin(x.ora_fine?.slice(0,5)) > sMin))

      rendered.push(
        <div key={a.id} style={{
          position:'absolute', top, height:ht,
          left:`calc(48px + (100% - 48px) * ${dayIdx * dayFrac + col * colFrac} + 1px)`,
          width:`calc((100% - 48px) * ${colFrac} - 2px)`,
          background:TIPO_COLOR[a.tipo]||'#D3D1C7', color:TIPO_TEXT[a.tipo]||'#444',
          borderRadius:4, padding:'2px 5px', fontSize:11, cursor:'pointer', overflow:'hidden', zIndex:2+col, boxSizing:'border-box',
        }} onClick={e=>{e.stopPropagation();setSelectedAppt(a);setShowDetail(true)}}>
          <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:a.titolo}
          </div>
          {ht>28&&<div style={{opacity:.9,fontSize:10}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</div>}
          {ht>42&&<div style={{opacity:.85,fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.sala}</div>}
          {ht>56&&a.profiles&&<div style={{opacity:.85,fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.profiles.nome} {a.profiles.cognome}</div>}
          {showPlus&&(
            <div style={{position:'absolute',bottom:2,right:2,background:'rgba(0,0,0,0.25)',borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:700,cursor:'pointer'}}
              onClick={e=>{e.stopPropagation();setDayPopupAppts(dayApptsFull);setDayPopupDate(a.data);setShowDayPopup(true)}}>
              +{hidden}
            </div>
          )}
        </div>
      )
    })
    return rendered
  }

  const rangeLabel = getRangeLabel()
  const todayStr = fmtDate(new Date())

  // Vista Giorno
  function renderGiorno() {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+offset)
    const dateStr = fmtDate(d)
    const dayAppts = appuntamenti.filter(a => a.data === dateStr)
    const sorted = [...dayAppts].sort((a,b) => timeToMin(a.ora_inizio?.slice(0,5)) - timeToMin(b.ora_inizio?.slice(0,5)))

    // Affiancamento senza limite di colonne — vista giornaliera ha tutto lo spazio
    const colEnd = []
    const apptCol = new Map()
    sorted.forEach(a => {
      const aS = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
      const aE = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
      let placed = false
      for (let ci = 0; ci < colEnd.length; ci++) {
        if (aS >= colEnd[ci]) { apptCol.set(a.id, ci); colEnd[ci] = aE; placed = true; break }
      }
      if (!placed) { apptCol.set(a.id, colEnd.length); colEnd.push(aE) }
    })
    const totalCols = Math.max(colEnd.length, 1)

    return (
      <div style={{...s.calOuter}}>
        <div style={{...s.cal, minWidth:300}}>
          <div style={{display:'grid',gridTemplateColumns:'48px 1fr',background:'#fafaf8',borderBottom:'0.5px solid #e8e5e0'}}>
            <div style={{borderRight:'0.5px solid #e8e5e0'}}/>
            <div style={{...s.dayHead,...(isToday(d)?s.dayHeadToday:{}),textAlign:'left',paddingLeft:12}}>
              <span style={{fontSize:18,fontWeight:600}}>{d.getDate()} </span>
              {d.toLocaleDateString('it-IT',{weekday:'long',month:'long',year:'numeric'})}
              {dayAppts.length>0&&<span style={{fontSize:12,color:'#888',marginLeft:12}}>{dayAppts.length} appuntament{dayAppts.length===1?'o':'i'}</span>}
            </div>
          </div>
          <div style={{position:'relative'}}>
            {HOURS.map(h=>(
              <div key={h} style={{display:'grid',gridTemplateColumns:'48px 1fr'}}>
                <div style={s.timeLabel}>{h}</div>
                <div style={{...s.dayCell,cursor:'pointer'}} onClick={()=>openNew(dateStr,h)}/>
              </div>
            ))}
            {sorted.map(a => {
              const col = apptCol.get(a.id) ?? 0
              const sMin = timeToMin(a.ora_inizio?.slice(0,5)||'09:00')
              const eMin = timeToMin(a.ora_fine?.slice(0,5)||'10:00')
              const top = (sMin - H_START*60)/60*48
              const ht = Math.max((eMin-sMin)/60*48-2, 24)
              const colFrac = 1/totalCols
              return (
                <div key={a.id} style={{
                  position:'absolute', top, height:ht,
                  left:`calc(48px + (100% - 48px) * ${col * colFrac} + 2px)`,
                  width:`calc((100% - 48px) * ${colFrac} - 4px)`,
                  background:TIPO_COLOR[a.tipo]||'#D3D1C7', color:TIPO_TEXT[a.tipo]||'#444',
                  borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', overflow:'hidden', zIndex:2+col, boxSizing:'border-box',
                }} onClick={e=>{e.stopPropagation();setSelectedAppt(a);setShowDetail(true)}}>
                  <div style={{fontWeight:600}}>{a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:a.titolo}</div>
                  {ht>24&&<div style={{fontSize:11,opacity:.9}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)} · {a.sala}</div>}
                  {ht>40&&a.profiles&&<div style={{fontSize:11,opacity:.85}}>{a.profiles.nome} {a.profiles.cognome}</div>}
                  {ht>56&&a.note&&<div style={{fontSize:11,opacity:.7,marginTop:2}}>{a.note}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Vista Settimana
  function renderSettimana() {
    const days = weekDays(offset)
    return (
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
            {days.map((d, dayIdx) => {
              const dateStr = fmtDate(d)
              const dayAppts = appuntamenti.filter(a => a.data === dateStr)
              return renderEvents(dayAppts, dayIdx, 5)
            })}
          </div>
        </div>
      </div>
    )
  }

  // Vista Mese
  function renderMese() {
    const today = new Date(); today.setHours(0,0,0,0)
    const base = new Date(today.getFullYear(), today.getMonth()+offset, 1)
    const year = base.getFullYear(); const month = base.getMonth()
    const firstDay = (new Date(year,month,1).getDay()||7) - 1
    const daysInMonth = new Date(year,month+1,0).getDate()
    const cells = []
    for (let i=0; i<firstDay; i++) cells.push(null)
    for (let d=1; d<=daysInMonth; d++) cells.push(new Date(year,month,d))
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks = []
    for (let i=0; i<cells.length; i+=7) weeks.push(cells.slice(i,i+7))
    return (
      <div style={{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'#fafaf8',borderBottom:'0.5px solid #e8e5e0'}}>
          {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g=>(
            <div key={g} style={{padding:'8px',textAlign:'center',fontSize:12,color:'#888',fontWeight:500}}>{g}</div>
          ))}
        </div>
        {weeks.map((week,wi)=>(
          <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'0.5px solid #f0ede8'}}>
            {week.map((d,di)=>{
              if (!d) return <div key={di} style={{minHeight:80,background:'#fafaf8',borderRight:'0.5px solid #f0ede8'}}/>
              const dateStr = fmtDate(d)
              const dayAppts = appuntamenti.filter(a => a.data === dateStr)
              const isT = isToday(d)
              return (
                <div key={di} style={{minHeight:80,padding:'4px',borderRight:'0.5px solid #f0ede8',cursor:'pointer',background:isT?'#f0f7ff':'#fff'}}
                  onClick={()=>openNew(dateStr,'09:00')}>
                  <div style={{fontSize:12,fontWeight:isT?700:400,color:isT?'#1a3a5c':'#333',marginBottom:3,
                    width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    background:isT?'#1a3a5c':'transparent',color:isT?'#fff':'#333'}}>{d.getDate()}</div>
                  {dayAppts.slice(0,2).map(a=>(
                    <div key={a.id} style={{fontSize:10,background:TIPO_COLOR[a.tipo],color:TIPO_TEXT[a.tipo],borderRadius:3,padding:'1px 4px',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',cursor:'pointer'}}
                      onClick={e=>{e.stopPropagation();setSelectedAppt(a);setShowDetail(true)}}>
                      {a.ora_inizio?.slice(0,5)} {a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:a.titolo}
                    </div>
                  ))}
                  {dayAppts.length>2&&(
                    <div style={{fontSize:10,color:'#888',cursor:'pointer',padding:'1px 4px'}}
                      onClick={e=>{e.stopPropagation();setDayPopupAppts(dayAppts);setDayPopupDate(dateStr);setShowDayPopup(true)}}>
                      +{dayAppts.length-2} altri
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // Vista Trimestre
  function renderTrimestre() {
    const today = new Date(); today.setHours(0,0,0,0)
    const q = Math.floor(today.getMonth()/3) + offset
    const year = today.getFullYear() + Math.floor(q/4)
    const qNorm = ((q % 4) + 4) % 4
    const months = [qNorm*3, qNorm*3+1, qNorm*3+2]
    return (
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {months.map(m=>{
          const firstDay = (new Date(year,m,1).getDay()||7)-1
          const daysInMonth = new Date(year,m+1,0).getDate()
          const cells = []
          for (let i=0;i<firstDay;i++) cells.push(null)
          for (let d=1;d<=daysInMonth;d++) cells.push(new Date(year,m,d))
          while (cells.length%7!==0) cells.push(null)
          const weeks = []
          for (let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7))
          return (
            <div key={m} style={{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:'#fafaf8',borderBottom:'0.5px solid #e8e5e0',fontSize:13,fontWeight:600,color:'#1a1a1a'}}>
                {MESI[m]} {year}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                {['L','M','M','G','V','S','D'].map((g,i)=>(
                  <div key={i} style={{textAlign:'center',fontSize:10,color:'#aaa',padding:'4px 0'}}>{g}</div>
                ))}
              </div>
              {weeks.map((week,wi)=>(
                <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                  {week.map((d,di)=>{
                    if (!d) return <div key={di} style={{height:32}}/>
                    const dateStr = fmtDate(d)
                    const cnt = appuntamenti.filter(a=>a.data===dateStr).length
                    const isT = isToday(d)
                    return (
                      <div key={di} style={{height:32,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}
                        onClick={()=>{
                          const dayAppts = appuntamenti.filter(a=>a.data===dateStr)
                          if (dayAppts.length) { setDayPopupAppts(dayAppts); setDayPopupDate(dateStr); setShowDayPopup(true) }
                          else openNew(dateStr,'09:00')
                        }}>
                        <div style={{fontSize:11,width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                          background:isT?'#1a3a5c':cnt>0?'#E6F1FB':'transparent',color:isT?'#fff':cnt>0?'#0C447C':'#555',fontWeight:isT||cnt>0?600:400}}>
                          {d.getDate()}
                        </div>
                        {cnt>0&&<div style={{fontSize:9,color:'#1a3a5c',fontWeight:600}}>{cnt}</div>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // Vista Anno
  function renderAnno() {
    const year = new Date().getFullYear() + offset
    return (
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {Array.from({length:12},(_,m)=>{
          const firstDay = (new Date(year,m,1).getDay()||7)-1
          const daysInMonth = new Date(year,m+1,0).getDate()
          const monthAppts = appuntamenti.filter(a=>a.data?.startsWith(`${year}-${String(m+1).padStart(2,'0')}`))
          const cells = []
          for (let i=0;i<firstDay;i++) cells.push(null)
          for (let d=1;d<=daysInMonth;d++) cells.push(d)
          while (cells.length%7!==0) cells.push(null)
          const weeks = []
          for (let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7))
          return (
            <div key={m} style={{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:8,overflow:'hidden'}}>
              <div style={{padding:'5px 8px',background:'#fafaf8',borderBottom:'0.5px solid #e8e5e0',fontSize:12,fontWeight:600,color:'#1a1a1a',display:'flex',justifyContent:'space-between'}}>
                <span>{MESI[m]}</span>
                {monthAppts.length>0&&<span style={{fontSize:11,color:'#1a3a5c',fontWeight:600}}>{monthAppts.length} appt.</span>}
              </div>
              <div style={{padding:'4px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1}}>
                  {['L','M','M','G','V','S','D'].map((g,i)=>(
                    <div key={i} style={{textAlign:'center',fontSize:8,color:'#ccc'}}>{g}</div>
                  ))}
                  {cells.map((d,i)=>{
                    if (!d) return <div key={i} style={{height:14}}/>
                    const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                    const cnt = appuntamenti.filter(a=>a.data===dateStr).length
                    const isT = isTodayStr(dateStr)
                    return (
                      <div key={i} style={{height:14,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
                        borderRadius:2,background:isT?'#1a3a5c':cnt>0?'#E6F1FB':'transparent',
                        fontSize:8,color:isT?'#fff':cnt>0?'#0C447C':'#888'}}
                        onClick={()=>{
                          const dayAppts = appuntamenti.filter(a=>a.data===dateStr)
                          if (dayAppts.length) { setDayPopupAppts(dayAppts); setDayPopupDate(dateStr); setShowDayPopup(true) }
                          else openNew(dateStr,'09:00')
                        }}>
                        {d}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Agenda</h2>
        <div style={s.navWeek}>
          <button style={s.navBtn} onClick={()=>setOffset(o=>o-1)}>‹</button>
          <span style={s.weekLabel}>{rangeLabel}</span>
          <button style={s.navBtn} onClick={()=>setOffset(o=>o+1)}>›</button>
        </div>
        <button style={s.btnSecondary} onClick={()=>setOffset(0)}>Oggi</button>
      </div>

      <div style={s.tabRow}>
        {[['calendario','Calendario'],['sale','Sale'],['disponibilita','Disponibilità']].map(([id,label])=>(
          <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
        ))}
        <div style={{flex:1}}/>
        {tab==='calendario' && (
          <>
            <div style={{display:'flex',gap:2,background:'#f5f4f0',borderRadius:8,padding:2}}>
              {VIEWS.map(v=>(
                <button key={v.id} style={{...s.viewBtn,...(view===v.id?s.viewBtnActive:{})}} onClick={()=>{setView(v.id);setOffset(0)}}>{v.label}</button>
              ))}
            </div>
            {(view==='settimana'||view==='giorno') && <>
              <select style={s.select} value={filterOp} onChange={e=>setFilterOp(e.target.value)}>
                <option value="">Tutti gli operatori</option>
                {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
              </select>
              <select style={s.select} value={filterSala} onChange={e=>setFilterSala(e.target.value)}>
                <option value="">Tutte le sale</option>
                {sale.filter(s=>s.attiva).map(s=><option key={s.id}>{s.nome}</option>)}
              </select>
            </>}
          </>
        )}
        <button style={s.btnPrimary} onClick={()=>openNew(fmtDate(new Date()),'09:00')}>+ Appuntamento</button>
      </div>

      {tab==='calendario' && (
        <>
          {(view==='settimana'||view==='giorno') && (
            <div style={s.legend}>
              {TIPI.map(t=>(
                <div key={t} style={s.legItem}><div style={{...s.legDot,background:TIPO_COLOR[t]}}/>{TIPO_LABEL[t]}</div>
              ))}
            </div>
          )}
          {view==='giorno' && renderGiorno()}
          {view==='settimana' && renderSettimana()}
          {view==='mese' && renderMese()}
          {view==='trimestre' && renderTrimestre()}
          {view==='anno' && renderAnno()}
        </>
      )}

      {tab==='sale' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
            <span style={{fontSize:13,color:'#888'}}>Occupazione sale — oggi {new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</span>
            {can.manageUsers&&(
              <div style={{display:'flex',gap:8}}>
                <input style={{...s.input,width:200}} placeholder="Nome nuova sala..." value={nuovaSala} onChange={e=>setNuovaSala(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSala()}/>
                <button style={s.btnPrimary} onClick={addSala}>+ Aggiungi</button>
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {sale.map(sala=>{
              const appts=apptOggi.filter(a=>a.sala===sala.nome)
              const nowMin=new Date().getHours()*60+new Date().getMinutes()
              const inUso=sala.attiva&&appts.some(a=>timeToMin(a.ora_inizio?.slice(0,5))<=nowMin&&timeToMin(a.ora_fine?.slice(0,5))>nowMin)
              const occCorrente=appts.find(a=>timeToMin(a.ora_inizio?.slice(0,5))<=nowMin&&timeToMin(a.ora_fine?.slice(0,5))>nowMin)
              return(
                <div key={sala.id} style={{...s.card,opacity:sala.attiva?1:.5,borderLeft:`3px solid ${inUso?'#E24B4A':sala.attiva?'#1D9E75':'#B4B2A9'}`}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontSize:15,fontWeight:600}}>{sala.nome}</div>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:!sala.attiva?'#F1EFE8':inUso?'#FCEBEB':'#EAF3DE',color:!sala.attiva?'#888':inUso?'#791F1F':'#27500A'}}>
                      {!sala.attiva?'Disattivata':inUso?'Occupata':'Libera'}
                    </span>
                  </div>
                  {inUso&&occCorrente&&<div style={{fontSize:12,color:'#791F1F',marginBottom:6,fontWeight:500}}>In uso: {occCorrente.titolo} fino alle {occCorrente.ora_fine?.slice(0,5)}{occCorrente.profiles&&` (${occCorrente.profiles.nome})`}</div>}
                  <div style={{fontSize:12,color:'#888',marginBottom:appts.length?6:0}}>{appts.length} appuntament{appts.length===1?'o':'i'} oggi</div>
                  {appts.sort((a,b)=>a.ora_inizio>b.ora_inizio?1:-1).map(a=>(
                    <div key={a.id} style={{fontSize:12,padding:'3px 0',borderTop:'0.5px solid #f5f3ee',display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{color:'#1a3a5c',fontWeight:500,whiteSpace:'nowrap',minWidth:90}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</span>
                      <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.titolo}</span>
                      {a.profiles&&<span style={{color:'#aaa',fontSize:11,whiteSpace:'nowrap'}}>{a.profiles.nome?.charAt(0)}.{a.profiles.cognome}</span>}
                    </div>
                  ))}
                  {can.manageUsers&&<button style={{...s.btnSmall,marginTop:8,color:sala.attiva?'#b91c1c':'#27500A',fontSize:11}} onClick={()=>toggleSala(sala.id,sala.attiva)}>{sala.attiva?'Disattiva':'Riattiva'} sala</button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab==='disponibilita' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
          <div>
            <div style={s.sectionLabel}>Aggiungi fascia oraria</div>
            {can.viewAll&&<div style={s.field}><label style={s.label}>Operatore</label>
              <select style={s.input} value={dispOpFilter} onChange={e=>setDispOpFilter(e.target.value)}>
                <option value="">— me stesso —</option>
                {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
              </select>
            </div>}
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={dispForm.tipo} onChange={e=>setDispForm(f=>({...f,tipo:e.target.value}))}>
                <option value="ricorrente">Ricorrente — ogni settimana</option>
                <option value="giorno_specifico">Giorno specifico</option>
              </select>
            </div>
            {dispForm.tipo==='ricorrente'
              ?<div style={s.field}><label style={s.label}>Giorno</label>
                <select style={s.input} value={dispForm.giorno_settimana} onChange={e=>setDispForm(f=>({...f,giorno_settimana:e.target.value}))}>
                  {[1,2,3,4,5].map(d=><option key={d} value={d}>{GIORNI[d]}</option>)}
                </select></div>
              :<div style={s.field}><label style={s.label}>Data</label>
                <input type="date" style={s.input} value={dispForm.data_specifica} onChange={e=>setDispForm(f=>({...f,data_specifica:e.target.value}))}/></div>
            }
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Dalle</label><input type="time" style={s.input} value={dispForm.ora_inizio} onChange={e=>setDispForm(f=>({...f,ora_inizio:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Alle</label><input type="time" style={s.input} value={dispForm.ora_fine} onChange={e=>setDispForm(f=>({...f,ora_fine:e.target.value}))}/></div>
            </div>
            <button style={{...s.btnPrimary,marginTop:10}} onClick={saveDisp}>Salva disponibilità</button>
          </div>
          <div>
            <div style={s.sectionLabel}>Disponibilità impostate</div>
            {can.viewAll&&<select style={{...s.input,marginBottom:12}} value={dispOpFilter} onChange={e=>setDispOpFilter(e.target.value)}>
              <option value="">Tutti gli operatori</option>
              {operatori.map(o=><option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
            </select>}
            {disponibilita.filter(d=>!dispOpFilter||d.operatore_id===dispOpFilter).map(d=>(
              <div key={d.id} style={{...s.card,marginBottom:8,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{d.profiles?.nome} {d.profiles?.cognome}</div>
                  <div style={{fontSize:12,color:'#888',marginTop:2}}>{d.tipo==='ricorrente'?`Ogni ${GIORNI[d.giorno_settimana]}`:`Il ${fmtIt(d.data_specifica)}`}{' — '}{d.ora_inizio?.slice(0,5)}–{d.ora_fine?.slice(0,5)}</div>
                </div>
                <button style={{...s.btnSmall,color:'#b91c1c',fontSize:11}} onClick={()=>deleteDisp(d.id)}>Rimuovi</button>
              </div>
            ))}
            {disponibilita.filter(d=>!dispOpFilter||d.operatore_id===dispOpFilter).length===0&&<div style={{fontSize:13,color:'#aaa'}}>Nessuna disponibilità impostata.</div>}
          </div>
        </div>
      )}

      {/* Day popup */}
      {showDayPopup&&(
        <>
          <div style={s.overlay} onClick={()=>setShowDayPopup(false)}/>
          <div style={s.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontSize:15,fontWeight:600,color:'#1a1a1a',margin:0}}>Appuntamenti — {fmtIt(dayPopupDate)}</h3>
              <button style={s.closeBtn} onClick={()=>setShowDayPopup(false)}>✕</button>
            </div>
            {dayPopupAppts.sort((a,b)=>a.ora_inizio>b.ora_inizio?1:-1).map(a=>(
              <div key={a.id} style={{...s.card,padding:'10px 12px',marginBottom:6,cursor:'pointer',borderLeft:`3px solid ${TIPO_COLOR[a.tipo]}`}}
                onClick={()=>{setSelectedAppt(a);setShowDetail(true);setShowDayPopup(false)}}>
                <div style={{fontWeight:600,fontSize:13}}>{a.candidati?`${a.candidati.nome} ${a.candidati.cognome}`:a.titolo}</div>
                <div style={{fontSize:12,color:'#888',marginTop:2}}>{a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)} · {a.sala}</div>
                {a.profiles&&<div style={{fontSize:11,color:'#aaa'}}>{a.profiles.nome} {a.profiles.cognome}</div>}
              </div>
            ))}
            <button style={{...s.btnPrimary,marginTop:4}} onClick={()=>{setShowDayPopup(false);openNew(dayPopupDate,'09:00')}}>+ Aggiungi appuntamento</button>
          </div>
        </>
      )}

      {/* Detail modal */}
      {showDetail&&selectedAppt&&(
        <>
          <div style={s.overlay} onClick={()=>setShowDetail(false)}/>
          <div style={s.modal}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:TIPO_COLOR[selectedAppt.tipo],color:TIPO_TEXT[selectedAppt.tipo]}}>{TIPO_LABEL[selectedAppt.tipo]}</span>
              <button style={s.closeBtn} onClick={()=>setShowDetail(false)}>✕</button>
            </div>
            <div style={{fontSize:17,fontWeight:600,margin:'8px 0'}}>{selectedAppt.titolo}</div>
            <div style={s.dl}>Candidato</div><div style={s.dv}>{selectedAppt.candidati?`${selectedAppt.candidati.nome} ${selectedAppt.candidati.cognome}`:'—'}</div>
            <div style={s.dl}>Operatore</div><div style={s.dv}>{selectedAppt.profiles?`${selectedAppt.profiles.nome} ${selectedAppt.profiles.cognome}`:'—'}</div>
            <div style={s.dl}>Sala</div><div style={s.dv}>{selectedAppt.sala||'—'}</div>
            <div style={s.dl}>Orario</div><div style={s.dv}>{fmtIt(selectedAppt.data)} · {selectedAppt.ora_inizio?.slice(0,5)}–{selectedAppt.ora_fine?.slice(0,5)}</div>
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
            <h3 style={{fontSize:16,fontWeight:600,margin:0}}>{editId?'Modifica':'Nuovo appuntamento'}</h3>
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={form.tipo||'colloquio'} onChange={e=>handleFormChange({tipo:e.target.value})}>
                {TIPI.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Candidato (opzionale)</label>
              <input style={s.input} placeholder="Cerca nome..." value={candSearch} onChange={e=>searchCand(e.target.value)}/>
              {candSuggests.length>0&&<div style={s.suggest}>{candSuggests.map(c=><div key={c.id} style={s.suggestItem} onMouseDown={()=>selectCand(c)}>{c.nome} {c.cognome} <span style={{color:'#aaa',fontSize:11}}>{c.tel}</span></div>)}</div>}
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
            {conflict&&conflict.length>0&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
              {conflict.map((w,i)=><div key={i} style={{background:'#FCEBEB',border:'0.5px solid #E24B4A',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#791F1F'}}>
                ⚠️ <strong>{w.tipo==='sala'?'Sala occupata':w.tipo==='operatore'?'Operatore occupato':'Candidato già prenotato'}:</strong> {w.msg}
              </div>)}
            </div>}
            <div style={s.field}><label style={s.label}>Data</label>
              <input type="date" style={s.input} value={form.data||''} onChange={e=>handleFormChange({data:e.target.value})}/>
            </div>
            {form.operatore_id&&form.data&&getDispForOpDate(form.operatore_id,form.data).length>0&&(
              <div style={{background:'#EAF3DE',border:'0.5px solid #27500A',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#27500A'}}>
                ✓ Disponibilità: {getDispForOpDate(form.operatore_id,form.data).map(d=>`${d.ora_inizio?.slice(0,5)}–${d.ora_fine?.slice(0,5)}`).join(', ')}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Dalle</label><input type="time" style={s.input} value={form.ora_inizio||'09:00'} onChange={e=>handleFormChange({ora_inizio:e.target.value})}/></div>
              <div style={s.field}><label style={s.label}>Alle</label><input type="time" style={s.input} value={form.ora_fine||'10:00'} onChange={e=>handleFormChange({ora_fine:e.target.value})}/></div>
            </div>
            <div style={s.field}><label style={s.label}>Note</label>
              <textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
              <button style={s.btnSecondary} onClick={()=>{setShowModal(false);setConflict(null)}}>Annulla</button>
              <button style={{...s.btnPrimary,...(conflict&&conflict.length>0?{background:'#e05a00'}:{})}} onClick={saveAppt}>
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
  wrap:{maxWidth:1200,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem',flexWrap:'wrap'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  navWeek:{display:'flex',alignItems:'center',gap:6},
  navBtn:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:14,color:'#333'},
  weekLabel:{fontSize:13,color:'#555',minWidth:160,textAlign:'center'},
  tabRow:{display:'flex',gap:4,marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'},
  tab:{padding:'5px 16px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:13,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  viewBtn:{background:'transparent',border:'none',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#888'},
  viewBtnActive:{background:'#fff',color:'#1a3a5c',fontWeight:600,boxShadow:'0 1px 3px rgba(0,0,0,0.1)'},
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
