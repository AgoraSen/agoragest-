// src/pages/Aziende.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SETTORI = ['Industria','Commercio','Servizi','Agricoltura','Edilizia','Sanità','Istruzione','Tecnologia','Logistica','Turismo','Altro']
const TIPI = { assunzione:'Assunzione', tirocinio:'Tirocinio/Stage', entrambe:'Entrambe' }
const TIPO_COLOR = { assunzione:{bg:'#EAF3DE',color:'#27500A'}, tirocinio:{bg:'#EEEDFE',color:'#3C3489'}, entrambe:{bg:'#E6F1FB',color:'#0C447C'} }
const CONTRATTI = ['Tempo indeterminato','Tempo determinato','Apprendistato','Tirocinio','Stage','Part-time','Altro']

export default function Aziende() {
  const { profile } = useAuth()
  const [aziende, setAziende] = useState([])
  const [selected, setSelected] = useState(null)
  const [referenti, setReferenti] = useState([])
  const [offerte, setOfferte] = useState([])
  const [contatti, setContatti] = useState([])
  const [candidatiCollocati, setCandidatiCollocati] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterSettore, setFilterSettore] = useState('')
  const [tab, setTab] = useState('info')
  const [showModal, setShowModal] = useState(false)
  const [showReferenteModal, setShowReferenteModal] = useState(false)
  const [showOffertaModal, setShowOffertaModal] = useState(false)
  const [showContattoModal, setShowContattoModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [refForm, setRefForm] = useState({})
  const [offertaForm, setOffertaForm] = useState({})
  const [contattoForm, setContattoForm] = useState({})

  useEffect(() => { loadAziende() }, [])
  useEffect(() => { if (selected) loadDetails(selected.id) }, [selected])

  async function loadAziende() {
    const { data } = await supabase.from('aziende').select('*').order('nome')
    setAziende(data||[])
    setLoading(false)
  }

  async function loadDetails(id) {
    const [r, o, c, cand] = await Promise.all([
      supabase.from('referenti_aziende').select('*').eq('azienda_id',id).order('nome'),
      supabase.from('offerte').select('*').eq('azienda_id',id).order('data_apertura',{ascending:false}),
      supabase.from('contatti_aziende').select('*,profiles(nome,cognome)').eq('azienda_id',id).order('data',{ascending:false}),
      supabase.from('candidati').select('id,nome,cognome,stato,tipo_inserimento').eq('azienda_id',id).order('cognome'),
    ])
    setReferenti(r.data||[])
    setOfferte(o.data||[])
    setContatti(c.data||[])
    setCandidatiCollocati(cand.data||[])
  }

  async function saveAzienda() {
    if (!form.nome) return
    if (editId) {
      await supabase.from('aziende').update({...form,updated_at:new Date().toISOString()}).eq('id',editId)
    } else {
      await supabase.from('aziende').insert([form])
    }
    setShowModal(false); loadAziende()
    if (editId && selected?.id === editId) {
      const { data } = await supabase.from('aziende').select('*').eq('id',editId).single()
      setSelected(data)
    }
  }

  async function deleteAzienda(id) {
    if (!window.confirm('Eliminare questa azienda? Tutti i dati collegati verranno rimossi.')) return
    await supabase.from('aziende').delete().eq('id',id)
    setSelected(null); loadAziende()
  }

  async function saveReferente() {
    if (!refForm.nome) return
    if (refForm.id) {
      await supabase.from('referenti_aziende').update(refForm).eq('id',refForm.id)
    } else {
      await supabase.from('referenti_aziende').insert([{...refForm,azienda_id:selected.id}])
    }
    setShowReferenteModal(false); loadDetails(selected.id)
  }

  async function deleteReferente(id) {
    await supabase.from('referenti_aziende').delete().eq('id',id); loadDetails(selected.id)
  }

  async function saveOfferta() {
    if (!offertaForm.titolo) return
    if (offertaForm.id) {
      await supabase.from('offerte').update(offertaForm).eq('id',offertaForm.id)
    } else {
      await supabase.from('offerte').insert([{...offertaForm,azienda_id:selected.id}])
    }
    setShowOffertaModal(false); loadDetails(selected.id)
  }

  async function deleteOfferta(id) {
    await supabase.from('offerte').delete().eq('id',id); loadDetails(selected.id)
  }

  async function saveContatto() {
    if (!contattoForm.note) return
    await supabase.from('contatti_aziende').insert([{...contattoForm,azienda_id:selected.id,operatore_id:profile.id}])
    setShowContattoModal(false); loadDetails(selected.id)
  }

  function fmtIt(s) { if(!s)return '—'; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }

  const filtered = aziende.filter(a =>
    (!searchQ || a.nome.toLowerCase().includes(searchQ.toLowerCase()) || (a.citta||'').toLowerCase().includes(searchQ.toLowerCase())) &&
    (!filterTipo || a.tipo === filterTipo) &&
    (!filterSettore || a.settore === filterSettore)
  )

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Anagrafica Aziende</h2>
        <button style={s.btnPrimary} onClick={()=>{setEditId(null);setForm({tipo:'assunzione'});setShowModal(true)}}>+ Nuova azienda</button>
      </div>

      <div style={s.layout}>
        {/* Lista aziende */}
        <div style={s.sidebar}>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            <input style={s.input} placeholder="Cerca azienda o città..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            <div style={{display:'flex',gap:6}}>
              <select style={{...s.input,flex:1}} value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
                <option value="">Tutti i tipi</option>
                {Object.entries(TIPI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
              <select style={{...s.input,flex:1}} value={filterSettore} onChange={e=>setFilterSettore(e.target.value)}>
                <option value="">Tutti i settori</option>
                {SETTORI.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>{filtered.length} aziende</div>
          <div style={{overflowY:'auto',maxHeight:'calc(100vh - 280px)'}}>
            {loading ? <div style={{padding:16,color:'#aaa',fontSize:13}}>Caricamento...</div>
              : filtered.length === 0 ? <div style={{padding:16,color:'#aaa',fontSize:13}}>Nessuna azienda trovata.</div>
              : filtered.map(a=>(
              <div key={a.id} style={{...s.azCard,...(selected?.id===a.id?s.azCardActive:{})}} onClick={()=>{setSelected(a);setTab('info')}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.nome}</div>
                  <span style={{...s.badge,...(TIPO_COLOR[a.tipo]||TIPO_COLOR.assunzione),flexShrink:0}}>{TIPI[a.tipo]||a.tipo}</span>
                </div>
                {a.settore&&<div style={{fontSize:12,color:'#888',marginTop:2}}>{a.settore}{a.citta?` · ${a.citta}`:''}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Dettaglio azienda */}
        <div style={s.detail}>
          {!selected ? (
            <div style={{padding:'3rem',textAlign:'center',color:'#aaa'}}>
              <div style={{fontSize:32,marginBottom:8}}>🏢</div>
              <div style={{fontSize:14}}>Seleziona un'azienda dalla lista</div>
            </div>
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem',gap:8}}>
                <div>
                  <h3 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',margin:0}}>{selected.nome}</h3>
                  <div style={{fontSize:13,color:'#888',marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
                    {selected.settore&&<span>{selected.settore}</span>}
                    {selected.citta&&<span>📍 {selected.citta}</span>}
                    {selected.telefono&&<span>📞 {selected.telefono}</span>}
                    {selected.email&&<span>✉️ {selected.email}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button style={s.btnSecondary} onClick={()=>{setEditId(selected.id);setForm({...selected});setShowModal(true)}}>Modifica</button>
                  <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteAzienda(selected.id)}>Elimina</button>
                </div>
              </div>

              <div style={s.tabs}>
                {[['info','Info'],['referenti','Referenti'],['offerte','Offerte'],['contatti','Storico contatti'],['candidati','Candidati']].map(([id,label])=>(
                  <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
                ))}
              </div>

              {tab==='info' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Dati generali</div>
                    {[['Ragione sociale',selected.nome],['Settore',selected.settore],['Tipo',TIPI[selected.tipo]],['Sito web',selected.sito]].map(([l,v])=>v&&(
                      <div key={l} style={s.infoRow}><span style={s.infoLabel}>{l}</span><span style={s.infoVal}>{v}</span></div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <div style={s.cardTitle}>Dati fiscali e contatti</div>
                    {[['P.IVA',selected.piva],['Codice Fiscale',selected.cf],['Indirizzo',selected.indirizzo],['Città',selected.citta],['Telefono',selected.telefono],['Email',selected.email]].map(([l,v])=>v&&(
                      <div key={l} style={s.infoRow}><span style={s.infoLabel}>{l}</span><span style={s.infoVal}>{v}</span></div>
                    ))}
                  </div>
                  {selected.note&&(
                    <div style={{...s.card,gridColumn:'1/-1'}}>
                      <div style={s.cardTitle}>Note</div>
                      <div style={{fontSize:13,color:'#555',whiteSpace:'pre-wrap'}}>{selected.note}</div>
                    </div>
                  )}
                </div>
              )}

              {tab==='referenti' && (
                <div>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button style={s.btnPrimary} onClick={()=>{setRefForm({});setShowReferenteModal(true)}}>+ Aggiungi referente</button>
                  </div>
                  {referenti.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun referente aggiunto.</div>
                  :referenti.map(r=>(
                    <div key={r.id} style={{...s.card,marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'#1a3a5c',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,flexShrink:0}}>{r.nome?.[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{r.nome}</div>
                        {r.ruolo&&<div style={{fontSize:12,color:'#888'}}>{r.ruolo}</div>}
                        <div style={{display:'flex',gap:12,marginTop:4,flexWrap:'wrap'}}>
                          {r.telefono&&<span style={{fontSize:12,color:'#555'}}>📞 {r.telefono}</span>}
                          {r.email&&<span style={{fontSize:12,color:'#555'}}>✉️ {r.email}</span>}
                        </div>
                        {r.note&&<div style={{fontSize:12,color:'#aaa',marginTop:4}}>{r.note}</div>}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button style={s.btnSmall} onClick={()=>{setRefForm(r);setShowReferenteModal(true)}}>Modifica</button>
                        <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteReferente(r.id)}>Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==='offerte' && (
                <div>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button style={s.btnPrimary} onClick={()=>{setOffertaForm({stato:'aperta'});setShowOffertaModal(true)}}>+ Aggiungi offerta</button>
                  </div>
                  {offerte.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessuna offerta inserita.</div>
                  :offerte.map(o=>(
                    <div key={o.id} style={{...s.card,marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:600}}>{o.titolo}</div>
                          <div style={{fontSize:12,color:'#888',marginTop:2,display:'flex',gap:8,flexWrap:'wrap'}}>
                            {o.tipo_contratto&&<span>{o.tipo_contratto}</span>}
                            {o.data_apertura&&<span>Aperta il {fmtIt(o.data_apertura)}</span>}
                            {o.data_scadenza&&<span>Scade il {fmtIt(o.data_scadenza)}</span>}
                          </div>
                          {o.descrizione&&<div style={{fontSize:12,color:'#555',marginTop:6}}>{o.descrizione}</div>}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                          <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,
                            background:o.stato==='aperta'?'#EAF3DE':o.stato==='chiusa'?'#F1EFE8':'#FAEEDA',
                            color:o.stato==='aperta'?'#27500A':o.stato==='chiusa'?'#888':'#633806'}}>
                            {o.stato}
                          </span>
                          <div style={{display:'flex',gap:4}}>
                            <button style={s.btnSmall} onClick={()=>{setOffertaForm(o);setShowOffertaModal(true)}}>Modifica</button>
                            <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteOfferta(o.id)}>Elimina</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==='contatti' && (
                <div>
                  <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                    <button style={s.btnPrimary} onClick={()=>{setContattoForm({tipo:'telefonata',data:new Date().toISOString().slice(0,10)});setShowContattoModal(true)}}>+ Aggiungi contatto</button>
                  </div>
                  {contatti.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun contatto registrato.</div>
                  :contatti.map(c=>(
                    <div key={c.id} style={{...s.card,marginBottom:8,display:'flex',gap:12}}>
                      <div style={{fontSize:22}}>{c.tipo==='telefonata'?'📞':c.tipo==='email'?'✉️':c.tipo==='visita'?'🏢':'📝'}</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:500,textTransform:'capitalize'}}>{c.tipo}</span>
                          <span style={{fontSize:12,color:'#888'}}>{fmtIt(c.data)}</span>
                          {c.profiles&&<span style={{fontSize:12,color:'#aaa'}}>{c.profiles.nome} {c.profiles.cognome}</span>}
                        </div>
                        <div style={{fontSize:13,color:'#555'}}>{c.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==='candidati' && (
                <div>
                  {candidatiCollocati.length===0?<div style={{fontSize:13,color:'#aaa',padding:'1rem'}}>Nessun candidato collegato a questa azienda.</div>
                  :candidatiCollocati.map(c=>(
                    <div key={c.id} style={{...s.card,marginBottom:8,display:'flex',gap:12,alignItems:'center'}}>
                      <div style={{width:34,height:34,borderRadius:'50%',background:'#1a3a5c',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600}}>
                        {c.nome?.[0]}{c.cognome?.[0]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600}}>{c.nome} {c.cognome}</div>
                        <div style={{fontSize:12,color:'#888',marginTop:2,display:'flex',gap:8}}>
                          <span>{c.stato}</span>
                          {c.tipo_inserimento&&<span>· {c.tipo_inserimento}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal azienda */}
      {showModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowModal(false)}/>
          <div style={{...s.modal,width:'min(600px,96vw)'}}>
            <h3 style={s.modalTitle}>{editId?'Modifica azienda':'Nuova azienda'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Ragione sociale *</label>
                <input style={s.input} value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Settore</label>
                <select style={s.input} value={form.settore||''} onChange={e=>setForm(f=>({...f,settore:e.target.value}))}>
                  <option value="">—</option>{SETTORI.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>Tipo</label>
                <select style={s.input} value={form.tipo||'assunzione'} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                  {Object.entries(TIPI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>P.IVA</label><input style={s.input} value={form.piva||''} onChange={e=>setForm(f=>({...f,piva:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Codice Fiscale</label><input style={s.input} value={form.cf||''} onChange={e=>setForm(f=>({...f,cf:e.target.value}))}/></div>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Indirizzo</label><input style={s.input} value={form.indirizzo||''} onChange={e=>setForm(f=>({...f,indirizzo:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Città</label><input style={s.input} value={form.citta||''} onChange={e=>setForm(f=>({...f,citta:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Sito web</label><input style={s.input} value={form.sito||''} onChange={e=>setForm(f=>({...f,sito:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Telefono</label><input style={s.input} value={form.telefono||''} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))}/></div>
              <div style={s.field}><label style={s.label}>Email</label><input type="email" style={s.input} value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.label}>Note</label><textarea style={{...s.input,minHeight:80,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></div>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveAzienda}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal referente */}
      {showReferenteModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowReferenteModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{refForm.id?'Modifica referente':'Nuovo referente'}</h3>
            {[['Nome *','nome','text'],['Ruolo','ruolo','text'],['Telefono','telefono','tel'],['Email','email','email']].map(([l,k,t])=>(
              <div key={k} style={s.field}><label style={s.label}>{l}</label>
                <input type={t} style={s.input} value={refForm[k]||''} onChange={e=>setRefForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div style={s.field}><label style={s.label}>Note</label>
              <textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={refForm.note||''} onChange={e=>setRefForm(f=>({...f,note:e.target.value}))}/>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowReferenteModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveReferente}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal offerta */}
      {showOffertaModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowOffertaModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{offertaForm.id?'Modifica offerta':'Nuova offerta di lavoro'}</h3>
            <div style={s.field}><label style={s.label}>Titolo posizione *</label>
              <input style={s.input} value={offertaForm.titolo||''} onChange={e=>setOffertaForm(f=>({...f,titolo:e.target.value}))} placeholder="Es. Operatore di magazzino"/>
            </div>
            <div style={s.field}><label style={s.label}>Tipo contratto</label>
              <select style={s.input} value={offertaForm.tipo_contratto||''} onChange={e=>setOffertaForm(f=>({...f,tipo_contratto:e.target.value}))}>
                <option value="">—</option>{CONTRATTI.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={s.field}><label style={s.label}>Data apertura</label>
                <input type="date" style={s.input} value={offertaForm.data_apertura||''} onChange={e=>setOffertaForm(f=>({...f,data_apertura:e.target.value}))}/>
              </div>
              <div style={s.field}><label style={s.label}>Data scadenza</label>
                <input type="date" style={s.input} value={offertaForm.data_scadenza||''} onChange={e=>setOffertaForm(f=>({...f,data_scadenza:e.target.value}))}/>
              </div>
            </div>
            <div style={s.field}><label style={s.label}>Stato</label>
              <select style={s.input} value={offertaForm.stato||'aperta'} onChange={e=>setOffertaForm(f=>({...f,stato:e.target.value}))}>
                <option value="aperta">Aperta</option>
                <option value="chiusa">Chiusa</option>
                <option value="sospesa">Sospesa</option>
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Descrizione</label>
              <textarea style={{...s.input,minHeight:80,resize:'vertical'}} value={offertaForm.descrizione||''} onChange={e=>setOffertaForm(f=>({...f,descrizione:e.target.value}))}/>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowOffertaModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveOfferta}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal contatto */}
      {showContattoModal&&(
        <>
          <div style={s.overlay} onClick={()=>setShowContattoModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Registra contatto</h3>
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={contattoForm.tipo||'telefonata'} onChange={e=>setContattoForm(f=>({...f,tipo:e.target.value}))}>
                <option value="telefonata">📞 Telefonata</option>
                <option value="email">✉️ Email</option>
                <option value="visita">🏢 Visita</option>
                <option value="altro">📝 Altro</option>
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Data</label>
              <input type="date" style={s.input} value={contattoForm.data||''} onChange={e=>setContattoForm(f=>({...f,data:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Note *</label>
              <textarea style={{...s.input,minHeight:100,resize:'vertical'}} value={contattoForm.note||''} onChange={e=>setContattoForm(f=>({...f,note:e.target.value}))} placeholder="Descrivi il contatto..."/>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowContattoModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveContatto}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap:{maxWidth:1200,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  layout:{display:'grid',gridTemplateColumns:'300px 1fr',gap:16,alignItems:'start'},
  sidebar:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1rem',position:'sticky',top:0},
  detail:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1.25rem',minHeight:400},
  azCard:{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:6,border:'0.5px solid #e8e5e0'},
  azCardActive:{background:'#f0f7ff',borderColor:'#1a3a5c'},
  tabs:{display:'flex',gap:4,marginBottom:'1.25rem',flexWrap:'wrap'},
  tab:{padding:'5px 14px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:12,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  card:{background:'#fafaf8',border:'0.5px solid #e8e5e0',borderRadius:10,padding:'1rem'},
  cardTitle:{fontSize:12,fontWeight:600,color:'#888',marginBottom:8,textTransform:'uppercase',letterSpacing:.5},
  infoRow:{display:'flex',gap:8,fontSize:13,padding:'4px 0',borderBottom:'0.5px solid #f0ede8'},
  infoLabel:{color:'#888',minWidth:120,flexShrink:0},
  infoVal:{color:'#1a1a1a',flex:1},
  badge:{display:'inline-block',fontSize:11,padding:'2px 8px',borderRadius:20},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:20},
  modal:{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:14,padding:'1.5rem',zIndex:30,width:'min(500px,96vw)',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1a1a1a',margin:0},
  modalActions:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4},
  field:{display:'flex',flexDirection:'column',gap:4},
  label:{fontSize:12,color:'#888'},
  input:{padding:'8px 10px',border:'0.5px solid #d8d5ce',borderRadius:8,fontSize:13,background:'#fafaf8',color:'#1a1a1a',outline:'none',width:'100%'},
  btnPrimary:{background:'#1a3a5c',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,cursor:'pointer',fontWeight:500},
  btnSecondary:{background:'#fff',color:'#333',border:'0.5px solid #d8d5ce',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'},
  btnSmall:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#333'},
}
