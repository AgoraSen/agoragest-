// src/pages/Corsi.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPI = { gol:'GOL', regionale:'Regionale', interprofessionale:'Interprofessionale', fse:'FSE', interno:'Interno', altro:'Altro' }
const TIPI_COLOR = {
  gol:{bg:'#EAF3DE',color:'#27500A'}, regionale:{bg:'#E6F1FB',color:'#0C447C'},
  interprofessionale:{bg:'#EEEDFE',color:'#3C3489'}, fse:{bg:'#FAEEDA',color:'#633806'},
  interno:{bg:'#F1EFE8',color:'#555'}, altro:{bg:'#F1EFE8',color:'#555'}
}
const STATI = { programmato:'Programmato', in_corso:'In corso', completato:'Completato', annullato:'Annullato' }
const STATI_COLOR = {
  programmato:{bg:'#E6F1FB',color:'#0C447C'}, in_corso:{bg:'#EAF3DE',color:'#27500A'},
  completato:{bg:'#F1EFE8',color:'#555'}, annullato:{bg:'#FCEBEB',color:'#791F1F'}
}
const STATI_ISCR = { iscritto:'Iscritto', completato:'Completato', ritirato:'Ritirato', non_ammesso:'Non ammesso' }

export default function Corsi() {
  const { profile, can } = useAuth()
  const [corsi, setCorsi] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('info')
  const [docenti, setDocenti] = useState([])
  const [sessioni, setSessioni] = useState([])
  const [iscrizioni, setIscrizioni] = useState([])
  const [candidati, setCandidati] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDocenteModal, setShowDocenteModal] = useState(false)
  const [showSessioneModal, setShowSessioneModal] = useState(false)
  const [showIscrizioneModal, setShowIscrizioneModal] = useState(false)
  const [showPresenzeModal, setShowPresenzeModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [docenteForm, setDocenteForm] = useState({})
  const [sessioneForm, setSessioneForm] = useState({})
  const [selectedSessione, setSelectedSessione] = useState(null)
  const [presenze, setPresenze] = useState({})
  const [candSearch, setCandSearch] = useState('')
  const [candSuggests, setCandSuggests] = useState([])

  useEffect(() => { loadCorsi(); loadCandidati() }, [])
  useEffect(() => { if (selected) loadDetails(selected.id) }, [selected])

  async function loadCorsi() {
    setLoading(true)
    const { data } = await supabase.from('corsi').select('*').order('data_inizio', {ascending:false})
    setCorsi(data||[])
    setLoading(false)
  }

  async function loadCandidati() {
    const { data } = await supabase.from('candidati').select('id,nome,cognome,cf').order('cognome').limit(500)
    setCandidati(data||[])
  }

  async function loadDetails(id) {
    const [d, s, i] = await Promise.all([
      supabase.from('docenti_corsi').select('*').eq('corso_id',id).order('cognome'),
      supabase.from('sessioni').select('*').eq('corso_id',id).order('data'),
      supabase.from('iscrizioni').select('*, candidati(nome,cognome,cf)').eq('corso_id',id).order('created_at'),
    ])
    setDocenti(d.data||[])
    setSessioni(s.data||[])
    setIscrizioni(i.data||[])
  }

  async function saveCorso() {
    if (!form.nome) return
    if (editId) {
      await supabase.from('corsi').update({...form,updated_at:new Date().toISOString()}).eq('id',editId)
    } else {
      await supabase.from('corsi').insert([form])
    }
    setShowModal(false); loadCorsi()
    if (editId && selected?.id===editId) {
      const { data } = await supabase.from('corsi').select('*').eq('id',editId).single()
      setSelected(data)
    }
  }

  async function deleteCorso(id) {
    if (!window.confirm('Eliminare questo corso?')) return
    await supabase.from('corsi').delete().eq('id',id)
    setSelected(null); loadCorsi()
  }

  async function saveDocente() {
    if (!docenteForm.nome) return
    if (docenteForm.id) {
      await supabase.from('docenti_corsi').update(docenteForm).eq('id',docenteForm.id)
    } else {
      await supabase.from('docenti_corsi').insert([{...docenteForm,corso_id:selected.id}])
    }
    setShowDocenteModal(false); loadDetails(selected.id)
  }

  async function deleteDocente(id) {
    await supabase.from('docenti_corsi').delete().eq('id',id); loadDetails(selected.id)
  }

  async function saveSessione() {
    if (!sessioneForm.data) return
    if (sessioneForm.id) {
      await supabase.from('sessioni').update(sessioneForm).eq('id',sessioneForm.id)
    } else {
      // Crea sessione e poi crea presenze per tutti gli iscritti
      const { data: sess } = await supabase.from('sessioni').insert([{...sessioneForm,corso_id:selected.id}]).select().single()
      if (sess && iscrizioni.length > 0) {
        const presRows = iscrizioni.map(i=>({ sessione_id:sess.id, candidato_id:i.candidato_id, presente:false }))
        await supabase.from('presenze').insert(presRows)
      }
    }
    setShowSessioneModal(false); loadDetails(selected.id)
  }

  async function deleteSessione(id) {
    await supabase.from('sessioni').delete().eq('id',id); loadDetails(selected.id)
  }

  async function addIscrizione(candidatoId) {
    if (!candidatoId) return
    await supabase.from('iscrizioni').insert([{corso_id:selected.id,candidato_id:candidatoId}])
    // Aggiungi presenze per tutte le sessioni esistenti
    if (sessioni.length > 0) {
      const presRows = sessioni.map(s=>({ sessione_id:s.id, candidato_id:candidatoId, presente:false }))
      await supabase.from('presenze').insert(presRows)
    }
    // Aggiorna stato candidato a In formazione
    const { data:c } = await supabase.from('candidati').select('stato').eq('id',candidatoId).single()
    if (c?.stato==='Colloquio fissato'||c?.stato==='In attesa') {
      await supabase.from('candidati').update({stato:'In formazione'}).eq('id',candidatoId)
    }
    setShowIscrizioneModal(false); setCandSearch(''); setCandSuggests([])
    loadDetails(selected.id)
  }

  async function updateIscrizione(id, updates) {
    await supabase.from('iscrizioni').update(updates).eq('id',id)
    if (updates.attestato !== undefined || updates.stato === 'completato') {
      // Aggiorna stato candidato se completato
      const iscr = iscrizioni.find(i=>i.id===id)
      if (iscr && updates.stato==='completato') {
        await supabase.from('candidati').update({stato:'Collocato'}).eq('id',iscr.candidato_id)
      }
    }
    loadDetails(selected.id)
  }

  async function removeIscrizione(id) {
    if (!window.confirm('Rimuovere questo iscritto?')) return
    await supabase.from('iscrizioni').delete().eq('id',id); loadDetails(selected.id)
  }

  async function openPresenze(sessione) {
    setSelectedSessione(sessione)
    const { data } = await supabase.from('presenze').select('*,candidati(nome,cognome)').eq('sessione_id',sessione.id)
    const map = {}
    ;(data||[]).forEach(p => map[p.candidato_id] = p)
    setPresenze(map)
    setShowPresenzeModal(true)
  }

  async function togglePresenza(candidatoId) {
    const p = presenze[candidatoId]
    if (p?.id) {
      await supabase.from('presenze').update({presente:!p.presente}).eq('id',p.id)
    } else {
      await supabase.from('presenze').insert([{sessione_id:selectedSessione.id,candidato_id:candidatoId,presente:true}])
    }
    openPresenze(selectedSessione)
  }

  function searchCand(q) {
    setCandSearch(q)
    if (!q) { setCandSuggests([]); return }
    const already = new Set(iscrizioni.map(i=>i.candidato_id))
    setCandSuggests(candidati.filter(c=>!already.has(c.id)&&(c.nome+' '+c.cognome+' '+(c.cf||'')).toLowerCase().includes(q.toLowerCase())).slice(0,6))
  }

  function fmtIt(s) { if(!s)return '—'; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }
  function oreSessioni() { return sessioni.reduce((t,s)=>{ if(s.ora_inizio&&s.ora_fine){const[h1,m1]=s.ora_inizio.split(':').map(Number);const[h2,m2]=s.ora_fine.split(':').map(Number);return t+(h2*60+m2-h1*60-m1)/60}return t },0) }
  function percPresenze(candId) {
    if (!sessioni.length) return null
    // Conta presenze dal log
    return null // semplificato
  }

  const filtered = corsi.filter(c =>
    (!searchQ || c.nome.toLowerCase().includes(searchQ.toLowerCase())) &&
    (!filterTipo || c.tipo===filterTipo) &&
    (!filterStato || c.stato===filterStato)
  )

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Corsi</h2>
        <button style={s.btnPrimary} onClick={()=>{setEditId(null);setForm({tipo:'interno',stato:'programmato'});setShowModal(true)}}>+ Nuovo corso</button>
      </div>

      <div style={s.layout}>
        {/* Lista */}
        <div style={s.sidebar}>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            <input style={s.input} placeholder="Cerca corso..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            <div style={{display:'flex',gap:6}}>
              <select style={{...s.input,flex:1}} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
                <option value="">Tutti i tipi</option>
                {Object.entries(TIPI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <select style={{...s.input,flex:1}} value={filterStato} onChange={e=>setFilterStato(e.target.value)}>
                <option value="">Tutti gli stati</option>
                {Object.entries(STATI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>{filtered.length} corsi</div>
          <div style={{overflowY:'auto',maxHeight:'calc(100vh - 300px)'}}>
            {loading?<div style={{color:'#aaa',fontSize:13,padding:12}}>Caricamento...</div>
            :filtered.length===0?<div style={{color:'#aaa',fontSize:13,padding:12}}>Nessun corso trovato.</div>
            :filtered.map(c=>(
              <div key={c.id} style={{...s.corsoCard,...(selected?.id===c.id?s.corsoCardActive:{})}} onClick={()=>{setSelected(c);setTab('info')}}>
                <div style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:4}}>
                  <span style={{...s.badge,...(TIPI_COLOR[c.tipo]||TIPI_COLOR.altro),flexShrink:0}}>{TIPI[c.tipo]||c.tipo}</span>
                  <span style={{...s.badge,...(STATI_COLOR[c.stato]||STATI_COLOR.programmato),flexShrink:0}}>{STATI[c.stato]||c.stato}</span>
                </div>
                <div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:2}}>{c.nome}</div>
                <div style={{fontSize:12,color:'#888'}}>
                  {c.data_inizio&&fmtIt(c.data_inizio)}{c.data_fine&&` → ${fmtIt(c.data_fine)}`}
                  {c.sede&&<span style={{marginLeft:6}}>· {c.sede}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dettaglio */}
        <div style={s.detail}>
          {!selected?(
            <div style={{padding:'3rem',textAlign:'center',color:'#aaa'}}>
              <div style={{fontSize:32,marginBottom:8}}>📚</div>
              <div style={{fontSize:14}}>Seleziona un corso dalla lista</div>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem',gap:8,flexWrap:'wrap'}}>
                <div>
                  <div style={{display:'flex',gap:6,marginBottom:6}}>
                    <span style={{...s.badge,...(TIPI_COLOR[selected.tipo]||TIPI_COLOR.altro)}}>{TIPI[selected.tipo]||selected.tipo}</span>
                    <span style={{...s.badge,...(STATI_COLOR[selected.stato]||STATI_COLOR.programmato)}}>{STATI[selected.stato]||selected.stato}</span>
                  </div>
                  <h3 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',margin:0}}>{selected.nome}</h3>
                  <div style={{fontSize:13,color:'#888',marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
                    {selected.data_inizio&&<span>📅 {fmtIt(selected.data_inizio)} → {fmtIt(selected.data_fine)}</span>}
                    {selected.sede&&<span>📍 {selected.sede}</span>}
                    {selected.ore_totali&&<span>⏱ {selected.ore_totali}h</span>}
                    {selected.max_partecipanti&&<span>👥 max {selected.max_partecipanti}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={s.btnSecondary} onClick={()=>{setEditId(selected.id);setForm({...selected});setShowModal(true)}}>Modifica</button>
                  <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteCorso(selected.id)}>Elimina</button>
                </div>
              </div>

              <div style={s.tabs}>
                {[['info','Info'],['docenti','Docenti'],['sessioni','Sessioni'],['iscritti','Iscritti'],['presenze','Presenze']].map(([id,label])=>(
                  <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}
                    {id==='iscritti'&&iscrizioni.length>0&&<span style={{marginLeft:4,background:'#1a3a5c',color:'#fff',borderRadius:10,padding:'0 5px',fontSize:10}}>{iscrizioni.length}</span>}
                  </div>
                ))}
              </div>

              {/* INFO */}
              {tab==='info'&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Dati generali</div>
                    {[['Nome',selected.nome],['Tipo',TIPI[selected.tipo]],['Stato',STATI[selected.stato]],['Sede',selected.sede],['Ore totali',selected.ore_totali?selected.ore_totali+'h':null],['Max partecipanti',selected.max_partecipanti]].map(([l,v])=>v&&(
                      <div key={l} style={s.infoRow}><span style={s.infoLabel}>{l}</span><span>{v}</span></div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Finanziamento</div>
                    {[['Costo',selected.costo?`€ ${parseFloat(selected.costo).toLocaleString('it-IT')}`:null],['Finanziamento',selected.finanziamento],['Ente finanziatore',selected.ente_finanziatore]].map(([l,v])=>v&&(
                      <div key={l} style={s.infoRow}><span style={s.infoLabel}>{l}</span><span>{v}</span></div>
                    ))}
                    <div style={s.infoRow}><span style={s.infoLabel}>Ore programmate</span><span>{sessioni.length} sessioni · {oreSessioni().toFixed(1)}h</span></div>
                    <div style={s.infoRow}><span style={s.infoLabel}>Iscritti</span><span>{iscrizioni.length}{selected.max_partecipanti?` / ${selected.max_partecipanti}`:''}</span></div>
                  </div>
                  {selected.note&&<div style={{...s.card,gridColumn:'1/-1'}}>
                    <div style={s.cardTitle}>Note</div>
                    <div style={{fontSize:13,color:'#555',whiteSpace:'pre-wrap'}}>{selected.note}</div>
                  </div>}
                </div>
              )}

              {/* DOCENTI */}
              {tab==='docenti'&&(
                <div>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button style={s.btnPrimary} onClick={()=>{setDocenteForm({});setShowDocenteModal(true)}}>+ Aggiungi docente</button>
                  </div>
                  {docenti.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun docente assegnato.</div>
                  :docenti.map(d=>(
                    <div key={d.id} style={{...s.card,marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'#1a3a5c',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,flexShrink:0}}>{d.nome?.[0]}{d.cognome?.[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{d.nome} {d.cognome}</div>
                        {d.specializzazione&&<div style={{fontSize:12,color:'#888'}}>{d.specializzazione}</div>}
                        <div style={{display:'flex',gap:12,marginTop:4,flexWrap:'wrap'}}>
                          {d.email&&<span style={{fontSize:12,color:'#555'}}>✉️ {d.email}</span>}
                          {d.telefono&&<span style={{fontSize:12,color:'#555'}}>📞 {d.telefono}</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button style={s.btnSmall} onClick={()=>{setDocenteForm(d);setShowDocenteModal(true)}}>Modifica</button>
                        <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteDocente(d.id)}>Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SESSIONI */}
              {tab==='sessioni'&&(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <span style={{fontSize:13,color:'#888'}}>{sessioni.length} sessioni · {oreSessioni().toFixed(1)}h totali</span>
                    <button style={s.btnPrimary} onClick={()=>{setSessioneForm({});setShowSessioneModal(true)}}>+ Aggiungi sessione</button>
                  </div>
                  {sessioni.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessuna sessione programmata.</div>
                  :sessioni.map(s2=>{
                    const ore = s2.ora_inizio&&s2.ora_fine?((parseInt(s2.ora_fine)-parseInt(s2.ora_inizio))).toString():null
                    return(
                      <div key={s2.id} style={{...s.card,marginBottom:8,display:'flex',gap:12,alignItems:'center'}}>
                        <div style={{textAlign:'center',minWidth:48}}>
                          <div style={{fontSize:18,fontWeight:700,color:'#1a3a5c'}}>{s2.data?.slice(8,10)}</div>
                          <div style={{fontSize:11,color:'#888'}}>{new Date(s2.data+'T12:00:00').toLocaleDateString('it-IT',{month:'short'})}</div>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500}}>{s2.ora_inizio?.slice(0,5)}–{s2.ora_fine?.slice(0,5)}</div>
                          {s2.sede&&<div style={{fontSize:12,color:'#888'}}>{s2.sede}</div>}
                          {s2.note&&<div style={{fontSize:12,color:'#aaa'}}>{s2.note}</div>}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button style={s.btnSmall} onClick={()=>openPresenze(s2)}>👥 Presenze</button>
                          <button style={s.btnSmall} onClick={()=>{setSessioneForm(s2);setShowSessioneModal(true)}}>Modifica</button>
                          <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteSessione(s2.id)}>Elimina</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ISCRITTI */}
              {tab==='iscritti'&&(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <span style={{fontSize:13,color:'#888'}}>{iscrizioni.length}{selected.max_partecipanti?` / ${selected.max_partecipanti}`:''} iscritti</span>
                    <button style={s.btnPrimary} onClick={()=>{setCandSearch('');setCandSuggests([]);setShowIscrizioneModal(true)}}>+ Iscrivi candidato</button>
                  </div>
                  {iscrizioni.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun iscritto.</div>
                  :iscrizioni.map(i=>(
                    <div key={i.id} style={{...s.card,marginBottom:8,display:'flex',gap:12,alignItems:'center'}}>
                      <div style={{width:34,height:34,borderRadius:'50%',background:'#1a3a5c',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,flexShrink:0}}>
                        {i.candidati?.nome?.[0]}{i.candidati?.cognome?.[0]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{i.candidati?.nome} {i.candidati?.cognome}</div>
                        <div style={{fontSize:12,color:'#888'}}>{i.candidati?.cf}</div>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                        <select style={{...s.input,width:'auto',fontSize:12,padding:'3px 8px'}} value={i.stato} onChange={e=>updateIscrizione(i.id,{stato:e.target.value})}>
                          {Object.entries(STATI_ISCR).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                        </select>
                        <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
                          <input type="checkbox" checked={i.attestato||false} onChange={e=>updateIscrizione(i.id,{attestato:e.target.checked})}/>
                          Attestato
                        </label>
                        <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>removeIscrizione(i.id)}>Rimuovi</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PRESENZE RIEPILOGO */}
              {tab==='presenze'&&(
                <div>
                  {sessioni.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessuna sessione — aggiungi sessioni per registrare le presenze.</div>
                  :iscrizioni.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun iscritto — iscrivi candidati per registrare le presenze.</div>
                  :(
                    <div style={{overflowX:'auto'}}>
                      <table style={{...s.table,minWidth:400}}>
                        <thead><tr>
                          <th style={s.th}>Candidato</th>
                          {sessioni.map(s2=><th key={s2.id} style={{...s.th,textAlign:'center',fontSize:11}}>{fmtIt(s2.data)}</th>)}
                          <th style={{...s.th,textAlign:'center'}}>Totale</th>
                        </tr></thead>
                        <tbody>
                          {iscrizioni.map(i=>(
                            <PresenzaRow key={i.id} iscrizione={i} sessioni={sessioni} onToggle={openPresenze}/>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                    {sessioni.map(s2=>(
                      <button key={s2.id} style={s.btnSecondary} onClick={()=>openPresenze(s2)}>
                        👥 {fmtIt(s2.data)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal corso */}
      {showModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowModal(false)}/>
          <div style={{...s.modal,width:'min(600px,96vw)'}}>
            <h3 style={s.modalTitle}>{editId?'Modifica corso':'Nuovo corso'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Nome corso *</label>
                <input style={s.input} value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Tipo</label>
                <select style={s.input} value={form.tipo||'interno'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                  {Object.entries(TIPI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Stato</label>
                <select style={s.input} value={form.stato||'programmato'} onChange={e=>setForm(f=>({...f,stato:e.target.value}))}>
                  {Object.entries(STATI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Data inizio</label>
                <input type="date" style={s.input} value={form.data_inizio||''} onChange={e=>setForm(f=>({...f,data_inizio:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Data fine</label>
                <input type="date" style={s.input} value={form.data_fine||''} onChange={e=>setForm(f=>({...f,data_fine:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Sede</label>
                <input style={s.input} value={form.sede||''} onChange={e=>setForm(f=>({...f,sede:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Ore totali</label>
                <input type="number" style={s.input} value={form.ore_totali||''} onChange={e=>setForm(f=>({...f,ore_totali:parseInt(e.target.value)||null}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Max partecipanti</label>
                <input type="number" style={s.input} value={form.max_partecipanti||''} onChange={e=>setForm(f=>({...f,max_partecipanti:parseInt(e.target.value)||null}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Costo (€)</label>
                <input type="number" style={s.input} value={form.costo||''} onChange={e=>setForm(f=>({...f,costo:e.target.value||null}))}/>
              </div>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Finanziamento</label>
                <input style={s.input} value={form.finanziamento||''} onChange={e=>setForm(f=>({...f,finanziamento:e.target.value}))} placeholder="Es. Fondo Forte, FSE+, Regione Marche..."/>
              </div>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Ente finanziatore</label>
                <input style={s.input} value={form.ente_finanziatore||''} onChange={e=>setForm(f=>({...f,ente_finanziatore:e.target.value}))}/>
              </div>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Note</label>
                <textarea style={{...s.input,minHeight:80,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
              </div>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveCorso}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal docente */}
      {showDocenteModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowDocenteModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{docenteForm.id?'Modifica docente':'Aggiungi docente'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Nome *</label><input style={s.input} value={docenteForm.nome||''} onChange={e=>setDocenteForm(f=>({...f,nome:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Cognome</label><input style={s.input} value={docenteForm.cognome||''} onChange={e=>setDocenteForm(f=>({...f,cognome:e.target.value}))}/></div>
            </div>
            <div style={s.field}><label style={s.label}>Specializzazione</label><input style={s.input} value={docenteForm.specializzazione||''} onChange={e=>setDocenteForm(f=>({...f,specializzazione:e.target.value}))}/></div>
            <div style={s.field}><label style={s.label}>Email</label><input type="email" style={s.input} value={docenteForm.email||''} onChange={e=>setDocenteForm(f=>({...f,email:e.target.value}))}/></div>
            <div style={s.field}><label style={s.label}>Telefono</label><input style={s.input} value={docenteForm.telefono||''} onChange={e=>setDocenteForm(f=>({...f,telefono:e.target.value}))}/></div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowDocenteModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveDocente}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal sessione */}
      {showSessioneModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowSessioneModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{sessioneForm.id?'Modifica sessione':'Nuova sessione'}</h3>
            <div style={s.field}><label style={s.label}>Data *</label><input type="date" style={s.input} value={sessioneForm.data||''} onChange={e=>setSessioneForm(f=>({...f,data:e.target.value}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Ora inizio</label><input type="time" style={s.input} value={sessioneForm.ora_inizio||''} onChange={e=>setSessioneForm(f=>({...f,ora_inizio:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Ora fine</label><input type="time" style={s.input} value={sessioneForm.ora_fine||''} onChange={e=>setSessioneForm(f=>({...f,ora_fine:e.target.value}))}/></div>
            </div>
            <div style={s.field}><label style={s.label}>Sede (se diversa)</label><input style={s.input} value={sessioneForm.sede||''} onChange={e=>setSessioneForm(f=>({...f,sede:e.target.value}))}/></div>
            <div style={s.field}><label style={s.label}>Note</label><textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={sessioneForm.note||''} onChange={e=>setSessioneForm(f=>({...f,note:e.target.value}))}/></div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowSessioneModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveSessione}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal iscrizione */}
      {showIscrizioneModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowIscrizioneModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Iscrivi candidato</h3>
            <div style={s.field}><label style={s.label}>Cerca candidato</label>
              <input style={s.input} placeholder="Nome, cognome o CF..." value={candSearch} onChange={e=>searchCand(e.target.value)}/>
              {candSuggests.length>0&&(
                <div style={s.suggest}>
                  {candSuggests.map(c=>(
                    <div key={c.id} style={s.suggestItem} onMouseDown={()=>addIscrizione(c.id)}>
                      {c.nome} {c.cognome} <span style={{color:'#aaa',fontSize:11}}>{c.cf}</span>
                    </div>
                  ))}
                </div>
              )}
              {candSearch&&candSuggests.length===0&&<div style={{fontSize:12,color:'#aaa',padding:'8px 10px'}}>Nessun candidato trovato (o già iscritto)</div>}
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowIscrizioneModal(false)}>Chiudi</button>
            </div>
          </div>
        </>
      )}

      {/* Modal presenze */}
      {showPresenzeModal&&selectedSessione&&(
        <>
          <div style={s.overlay} onClick={()=>setShowPresenzeModal(false)}/>
          <div style={{...s.modal,width:'min(500px,96vw)'}}>
            <h3 style={s.modalTitle}>Presenze — {fmtIt(selectedSessione.data)}</h3>
            <div style={{fontSize:12,color:'#888',marginBottom:8}}>
              {selectedSessione.ora_inizio?.slice(0,5)}–{selectedSessione.ora_fine?.slice(0,5)}
              {selectedSessione.sede&&` · ${selectedSessione.sede}`}
            </div>
            {iscrizioni.length===0?<div style={{fontSize:13,color:'#aaa'}}>Nessun iscritto.</div>
            :iscrizioni.map(i=>{
              const p = presenze[i.candidato_id]
              return(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'0.5px solid #f5f3ee',cursor:'pointer'}}
                  onClick={()=>togglePresenza(i.candidato_id)}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:p?.presente?'#1D9E75':'#e8e5e0',color:p?.presente?'#fff':'#888',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                    {p?.presente?'✓':''}
                  </div>
                  <div style={{flex:1,fontSize:13}}>{i.candidati?.nome} {i.candidati?.cognome}</div>
                  <span style={{fontSize:12,color:p?.presente?'#27500A':'#aaa'}}>{p?.presente?'Presente':'Assente'}</span>
                </div>
              )
            })}
            <div style={{fontSize:12,color:'#888',marginTop:8}}>
              Presenti: {Object.values(presenze).filter(p=>p.presente).length} / {iscrizioni.length}
            </div>
            <div style={s.modalActions}>
              <button style={s.btnPrimary} onClick={()=>setShowPresenzeModal(false)}>Chiudi</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Componente riga presenze nel riepilogo
function PresenzaRow({ iscrizione, sessioni }) {
  const [presenze, setPresenze] = useState([])
  useEffect(() => {
    supabase.from('presenze').select('*').eq('candidato_id',iscrizione.candidato_id)
      .in('sessione_id', sessioni.map(s=>s.id))
      .then(({data})=>setPresenze(data||[]))
  }, [iscrizione.candidato_id, sessioni])
  const tot = presenze.filter(p=>p.presente).length
  return (
    <tr>
      <td style={{padding:'8px 12px',borderBottom:'0.5px solid #f5f3ee',fontSize:13}}>
        {iscrizione.candidati?.nome} {iscrizione.candidati?.cognome}
      </td>
      {sessioni.map(s2=>{
        const p = presenze.find(p=>p.sessione_id===s2.id)
        return <td key={s2.id} style={{padding:'8px 12px',borderBottom:'0.5px solid #f5f3ee',textAlign:'center',fontSize:14}}>
          {p?.presente?'✅':'⬜'}
        </td>
      })}
      <td style={{padding:'8px 12px',borderBottom:'0.5px solid #f5f3ee',textAlign:'center',fontSize:12,fontWeight:600,color:'#1a3a5c'}}>
        {tot}/{sessioni.length}
      </td>
    </tr>
  )
}

const s = {
  wrap:{maxWidth:1200,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  layout:{display:'grid',gridTemplateColumns:'300px 1fr',gap:16,alignItems:'start'},
  sidebar:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1rem',position:'sticky',top:0},
  detail:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1.25rem',minHeight:400},
  corsoCard:{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:6,border:'0.5px solid #e8e5e0'},
  corsoCardActive:{background:'#f0f7ff',borderColor:'#1a3a5c'},
  tabs:{display:'flex',gap:4,marginBottom:'1.25rem',flexWrap:'wrap'},
  tab:{padding:'5px 14px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:12,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  card:{background:'#fafaf8',border:'0.5px solid #e8e5e0',borderRadius:10,padding:'1rem'},
  cardTitle:{fontSize:12,fontWeight:600,color:'#888',marginBottom:8,textTransform:'uppercase',letterSpacing:.5},
  infoRow:{display:'flex',gap:8,fontSize:13,padding:'4px 0',borderBottom:'0.5px solid #f0ede8'},
  infoLabel:{color:'#888',minWidth:130,flexShrink:0},
  badge:{display:'inline-block',fontSize:11,padding:'2px 8px',borderRadius:20},
  table:{width:'100%',borderCollapse:'collapse',fontSize:13},
  th:{padding:'9px 12px',textAlign:'left',color:'#888',fontWeight:400,borderBottom:'0.5px solid #f0ede8',background:'#fafaf8',fontSize:12},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:20},
  modal:{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:14,padding:'1.5rem',zIndex:30,width:'min(500px,96vw)',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1a1a1a',margin:0},
  modalActions:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4},
  field:{display:'flex',flexDirection:'column',gap:4},
  label:{fontSize:12,color:'#888'},
  input:{padding:'8px 10px',border:'0.5px solid #d8d5ce',borderRadius:8,fontSize:13,background:'#fafaf8',color:'#1a1a1a',outline:'none',width:'100%'},
  suggest:{border:'0.5px solid #d8d5ce',borderRadius:8,background:'#fff',maxHeight:160,overflowY:'auto'},
  suggestItem:{padding:'8px 10px',fontSize:13,cursor:'pointer',borderBottom:'0.5px solid #f0ede8'},
  btnPrimary:{background:'#1a3a5c',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,cursor:'pointer',fontWeight:500},
  btnSecondary:{background:'#fff',color:'#333',border:'0.5px solid #d8d5ce',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'},
  btnSmall:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#333'},
}
