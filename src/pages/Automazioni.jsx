// src/pages/Automazioni.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPI_AUTO = {
  cambio_stato: { label: 'Cambio stato candidato', icon: '🔄', desc: 'Invia messaggio quando un candidato cambia stato' },
  promemoria_appt: { label: 'Promemoria appuntamento', icon: '⏰', desc: 'Avvisa il candidato il giorno prima dell\'appuntamento' },
  candidato_inattivo: { label: 'Candidato inattivo', icon: '👤', desc: 'Avvisa se un candidato non viene contattato per X giorni' },
  offerta_scadenza: { label: 'Scadenza offerta', icon: '📋', desc: 'Notifica quando un\'offerta di lavoro sta per scadere' },
  sequenza: { label: 'Sequenza messaggi', icon: '📨', desc: 'Invia una serie di messaggi programmati nel tempo' },
}

const STATI_CAND = ['In attesa','Colloquio fissato','In formazione','Collocato','Abbandonato / non risponde']
const CANALI = ['sms','email','entrambi']

export default function Automazioni() {
  const { profile, can } = useAuth()
  const [tab, setTab] = useState('regole')
  const [regole, setRegole] = useState([])
  const [log, setLog] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [running, setRunning] = useState(null)
  const [logFilter, setLogFilter] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [r, l, t] = await Promise.all([
      supabase.from('regole_automazione').select('*').order('created_at'),
      supabase.from('log_invii').select('*').eq('trigger_tipo','automazione').order('created_at',{ascending:false}).limit(100),
      supabase.from('templates').select('id,nome,testo,tipo').order('nome'),
    ])
    setRegole(r.data||[])
    setLog(l.data||[])
    setTemplates(t.data||[])
    setLoading(false)
  }

  async function saveRegola() {
    if (!form.nome || !form.tipo) return
    const payload = { ...form, attiva: form.attiva ?? true }
    if (editId) {
      await supabase.from('regole_automazione').update(payload).eq('id', editId)
    } else {
      await supabase.from('regole_automazione').insert([payload])
    }
    setShowModal(false)
    loadAll()
  }

  async function toggleRegola(id, attiva) {
    await supabase.from('regole_automazione').update({ attiva: !attiva }).eq('id', id)
    loadAll()
  }

  async function deleteRegola(id) {
    if (!window.confirm('Eliminare questa regola?')) return
    await supabase.from('regole_automazione').delete().eq('id', id)
    loadAll()
  }

  async function eseguiOra(regola) {
    setRunning(regola.id)
    try {
      const risultati = await eseguiRegola(regola)
      alert(`Regola eseguita: ${risultati} azioni registrate nel log.`)
      loadAll()
    } catch(e) {
      alert('Errore: ' + e.message)
    }
    setRunning(null)
  }

  async function eseguiTutte() {
    setRunning('all')
    let tot = 0
    for (const r of regole.filter(r=>r.attiva)) {
      try { tot += await eseguiRegola(r) } catch(e) {}
    }
    alert(`Esecuzione completata: ${tot} azioni registrate nel log.`)
    loadAll()
    setRunning(null)
  }

  async function sendEmailReale(to, subject, html) {
    try {
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html })
      })
      return res.ok
    } catch(e) {
      console.error('Errore invio email:', e)
      return false
    }
  }

  async function eseguiRegola(regola) {
    const oggi = new Date().toISOString().slice(0,10)
    const domani = new Date(Date.now()+86400000).toISOString().slice(0,10)
    let count = 0
    const tpl = templates.find(t=>t.id===regola.template_id)

    if (regola.tipo === 'promemoria_appt') {
      // Trova appuntamenti di domani senza promemoria già inviato
      const { data: appts } = await supabase
        .from('appuntamenti')
        .select('*, candidati(id,nome,cognome,tel,email)')
        .eq('data', domani).eq('stato','attivo')
      for (const a of appts||[]) {
        if (!a.candidati) continue
        // Controlla se già inviato oggi
        const { data: gia } = await supabase.from('log_invii')
          .select('id').eq('candidato_id', a.candidati.id).eq('trigger_tipo','automazione')
          .gte('created_at', oggi+'T00:00:00').limit(1)
        if (gia?.length) continue
        const testo = (tpl?.testo||`Gentile {{nome}}, ricordiamo l'appuntamento di domani alle ${a.ora_inizio?.slice(0,5)} presso ${a.sala}.`)
          .replace(/{{nome}}/g, a.candidati.nome).replace(/{{cognome}}/g, a.candidati.cognome)
          .replace(/{{ora_appuntamento}}/g, a.ora_inizio?.slice(0,5)||'').replace(/{{sala}}/g, a.sala||'')
        let statoInvio = 'Inviato (simulato)'
        if ((regola.canale==='email'||regola.canale==='entrambi') && a.candidati.email) {
          const ok = await sendEmailReale(
            a.candidati.email,
            `Promemoria appuntamento — ${domani}`,
            `<p>${testo.replace(/\n/g,'<br>')}</p><br><p><small>Agorà Società Cooperativa</small></p>`
          )
          statoInvio = ok ? 'Inviato' : 'Errore invio'
        }
        await supabase.from('log_invii').insert([{
          candidato_id: a.candidati.id, candidato_nome: `${a.candidati.nome} ${a.candidati.cognome}`,
          candidato_cf: a.candidati.cf, template_nome: regola.nome, canale: regola.canale||'sms',
          testo, stato: statoInvio, operatore_id: profile.id,
          operatore_nome: `${profile.nome} ${profile.cognome}`, trigger_tipo: 'automazione',
        }])
        count++
      }
    }

    if (regola.tipo === 'candidato_inattivo') {
      const giorni = regola.giorni_inattivita || 30
      const soglia = new Date(Date.now() - giorni*86400000).toISOString().slice(0,10)
      const { data: cands } = await supabase.from('candidati')
        .select('id,nome,cognome,cf,tel,email,stato,updated_at')
        .not('stato','eq','Collocato').not('stato','eq','Abbandonato / non risponde')
        .lte('updated_at', soglia+'T23:59:59')
      for (const c of cands||[]) {
        const { data: gia } = await supabase.from('log_invii')
          .select('id').eq('candidato_id', c.id).eq('trigger_tipo','automazione')
          .gte('created_at', oggi+'T00:00:00').limit(1)
        if (gia?.length) continue
        const testo = (tpl?.testo||`Gentile {{nome}}, sono passati ${giorni} giorni dall'ultimo contatto. La invitiamo a mettersi in contatto con noi.`)
          .replace(/{{nome}}/g, c.nome).replace(/{{cognome}}/g, c.cognome)
        await supabase.from('log_invii').insert([{
          candidato_id: c.id, candidato_nome: `${c.nome} ${c.cognome}`, candidato_cf: c.cf,
          template_nome: regola.nome, canale: regola.canale||'sms', testo, stato: 'Inviato (simulato)',
          operatore_id: profile.id, operatore_nome: `${profile.nome} ${profile.cognome}`, trigger_tipo: 'automazione',
        }])
        count++
      }
    }

    if (regola.tipo === 'offerta_scadenza') {
      const giorni = regola.giorni_anticipo || 7
      const scadenza = new Date(Date.now() + giorni*86400000).toISOString().slice(0,10)
      const { data: offerte } = await supabase.from('offerte')
        .select('*, aziende(nome)').eq('stato','aperta').lte('data_scadenza', scadenza).gte('data_scadenza', oggi)
      for (const o of offerte||[]) {
        const testo = (tpl?.testo||`L'offerta "${o.titolo}" presso ${o.aziende?.nome} scade il ${o.data_scadenza}. Verificare lo stato.`)
        await supabase.from('log_invii').insert([{
          candidato_id: null, candidato_nome: `Offerta: ${o.titolo}`, candidato_cf: null,
          template_nome: regola.nome, canale: 'interno', testo, stato: 'Inviato (simulato)',
          operatore_id: profile.id, operatore_nome: `${profile.nome} ${profile.cognome}`, trigger_tipo: 'automazione',
        }])
        count++
      }
    }

    if (regola.tipo === 'cambio_stato') {
      // Questo tipo viene triggerato in tempo reale al cambio stato — qui mostriamo solo statistiche
      count = 0
    }

    return count
  }

  function fmtTs(s) { if(!s)return '—'; return new Date(s).toLocaleString('it-IT') }

  const filteredLog = log.filter(l => !logFilter || (l.candidato_nome+l.template_nome).toLowerCase().includes(logFilter.toLowerCase()))

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Automazioni</h2>
        <div style={{display:'flex',gap:8}}>
          <button style={s.btnSecondary} onClick={eseguiTutte} disabled={running==='all'}>
            {running==='all'?'Esecuzione...':'▶ Esegui tutte ora'}
          </button>
          <button style={s.btnPrimary} onClick={()=>{setEditId(null);setForm({attiva:true,canale:'sms'});setShowModal(true)}}>
            + Nuova regola
          </button>
        </div>
      </div>

      <div style={{background:'#f0f7ff',border:'0.5px solid #bdd6ee',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#1a3a5c',marginBottom:'1.25rem'}}>
        ℹ️ Le automazioni <strong>simulano</strong> l'invio e registrano tutto nel log. Per attivare SMS/email reali è necessario collegare un provider (Twilio, eSendex, ecc.). Contatta il supporto per l'integrazione.
      </div>

      <div style={s.tabs}>
        {[['regole','Regole'],['log','Log esecuzioni'],['info','Come funziona']].map(([id,label])=>(
          <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>

      {/* REGOLE */}
      {tab==='regole' && (
        <div>
          {loading ? <div style={{color:'#aaa',padding:16}}>Caricamento...</div>
          : regole.length === 0 ? (
            <div style={{textAlign:'center',padding:'3rem',color:'#aaa'}}>
              <div style={{fontSize:32,marginBottom:8}}>⚡</div>
              <div>Nessuna regola configurata. Creane una!</div>
            </div>
          ) : regole.map(r => (
            <div key={r.id} style={{...s.card,marginBottom:10,opacity:r.attiva?1:.6,borderLeft:`3px solid ${r.attiva?'#1D9E75':'#B4B2A9'}`}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{fontSize:28,flexShrink:0}}>{TIPI_AUTO[r.tipo]?.icon||'⚡'}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:15,fontWeight:600,color:'#1a1a1a'}}>{r.nome}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:r.attiva?'#EAF3DE':'#F1EFE8',color:r.attiva?'#27500A':'#888'}}>
                      {r.attiva?'Attiva':'Disattivata'}
                    </span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#f0ede8',color:'#555'}}>
                      {TIPI_AUTO[r.tipo]?.label||r.tipo}
                    </span>
                    {r.canale&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#E6F1FB',color:'#0C447C'}}>{r.canale.toUpperCase()}</span>}
                  </div>
                  <div style={{fontSize:12,color:'#888'}}>
                    {r.tipo==='promemoria_appt'&&'Invia promemoria il giorno prima degli appuntamenti'}
                    {r.tipo==='candidato_inattivo'&&`Avvisa candidati inattivi da più di ${r.giorni_inattivita||30} giorni`}
                    {r.tipo==='offerta_scadenza'&&`Avvisa ${r.giorni_anticipo||7} giorni prima della scadenza offerte`}
                    {r.tipo==='cambio_stato'&&`Invia messaggio quando un candidato passa allo stato "${r.stato_trigger||'...'}"`}
                    {r.tipo==='sequenza'&&`Sequenza di ${r.sequenza_steps||1} messaggi`}
                    {r.note&&<span style={{marginLeft:8,color:'#aaa'}}>— {r.note}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}>
                  <button style={{...s.btnSmall,background:r.attiva?'#FCEBEB':'#EAF3DE',color:r.attiva?'#791F1F':'#27500A',border:'none'}}
                    onClick={()=>toggleRegola(r.id,r.attiva)}>
                    {r.attiva?'Disattiva':'Attiva'}
                  </button>
                  <button style={s.btnSmall} onClick={()=>eseguiOra(r)} disabled={running===r.id}>
                    {running===r.id?'...':'▶ Esegui'}
                  </button>
                  <button style={s.btnSmall} onClick={()=>{setEditId(r.id);setForm({...r});setShowModal(true)}}>Modifica</button>
                  <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteRegola(r.id)}>Elimina</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOG */}
      {tab==='log' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
            <input style={{...s.input,flex:1,maxWidth:300}} placeholder="Cerca nel log..." value={logFilter} onChange={e=>setLogFilter(e.target.value)}/>
            <span style={{fontSize:12,color:'#888'}}>{filteredLog.length} esecuzioni</span>
          </div>
          {filteredLog.length===0?<div style={{color:'#aaa',fontSize:13,padding:16}}>Nessuna esecuzione registrata.</div>
          :<div style={{border:'0.5px solid #e8e5e0',borderRadius:12,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'140px 1fr 120px 80px 80px',gap:6,padding:'8px 12px',background:'#fafaf8',fontSize:11,color:'#888'}}>
              <div>Data e ora</div><div>Candidato / Oggetto</div><div>Regola</div><div>Canale</div><div>Stato</div>
            </div>
            <div style={{maxHeight:450,overflowY:'auto'}}>
              {filteredLog.map(l=>(
                <div key={l.id} style={{display:'grid',gridTemplateColumns:'140px 1fr 120px 80px 80px',gap:6,padding:'8px 12px',borderTop:'0.5px solid #f5f3ee',fontSize:12,alignItems:'center'}}>
                  <div style={{color:'#888',fontSize:11}}>{fmtTs(l.created_at)}</div>
                  <div>
                    <div style={{fontWeight:500}}>{l.candidato_nome}</div>
                    <div style={{fontSize:11,color:'#aaa',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l.testo?.substring(0,60)}...</div>
                  </div>
                  <div style={{fontSize:11,color:'#888'}}>{l.template_nome?.substring(0,20)}</div>
                  <div><span style={{fontSize:11,padding:'2px 6px',borderRadius:10,background:'#E6F1FB',color:'#0C447C'}}>{l.canale?.toUpperCase()}</span></div>
                  <div><span style={{fontSize:11,color:'#27500A'}}>{l.stato}</span></div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      )}

      {/* INFO */}
      {tab==='info' && (
        <div style={{maxWidth:700}}>
          <div style={{fontSize:13,color:'#555',lineHeight:1.8,marginBottom:'1.5rem'}}>
            Le automazioni permettono di inviare messaggi automatici ai candidati in base a eventi o condizioni. Ogni regola può essere eseguita manualmente o pianificata.
          </div>
          {Object.entries(TIPI_AUTO).map(([key,t])=>(
            <div key={key} style={{...s.card,marginBottom:10,display:'flex',gap:14}}>
              <div style={{fontSize:28,flexShrink:0}}>{t.icon}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:13,color:'#888'}}>{t.desc}</div>
                {key==='cambio_stato'&&<div style={{fontSize:12,color:'#1a3a5c',marginTop:4}}>→ Si attiva in tempo reale quando salvi un candidato con un nuovo stato</div>}
                {key==='promemoria_appt'&&<div style={{fontSize:12,color:'#1a3a5c',marginTop:4}}>→ Esegui ogni giorno mattina per inviare promemoria del giorno successivo</div>}
                {key==='candidato_inattivo'&&<div style={{fontSize:12,color:'#1a3a5c',marginTop:4}}>→ Esegui periodicamente per identificare candidati che non vengono contattati</div>}
                {key==='offerta_scadenza'&&<div style={{fontSize:12,color:'#1a3a5c',marginTop:4}}>→ Esegui ogni giorno per avvisare delle offerte in scadenza</div>}
                {key==='sequenza'&&<div style={{fontSize:12,color:'#1a3a5c',marginTop:4}}>→ Configura una serie di messaggi da inviare a distanza di giorni</div>}
              </div>
            </div>
          ))}
          <div style={{...s.card,background:'#fafaf8',marginTop:'1.5rem'}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Per attivare SMS/email reali:</div>
            <div style={{fontSize:12,color:'#555',lineHeight:1.8}}>
              1. Scegli un provider SMS (Twilio, eSendex, SMSHOSTING, ecc.)<br/>
              2. Ottieni le credenziali API del provider<br/>
              3. Aggiungi le variabili d'ambiente in Netlify<br/>
              4. Il codice di invio viene attivato con una modifica minima
            </div>
          </div>
        </div>
      )}

      {/* Modal regola */}
      {showModal && (
        <>
          <div style={s.overlay} onClick={()=>setShowModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editId?'Modifica regola':'Nuova regola di automazione'}</h3>
            <div style={s.field}><label style={s.label}>Nome regola</label>
              <input style={s.input} value={form.nome||''} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Es. Promemoria colloquio"/>
            </div>
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={form.tipo||''} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                <option value="">— Scegli tipo —</option>
                {Object.entries(TIPI_AUTO).map(([k,t])=><option key={k} value={k}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            {form.tipo && <div style={{background:'#f5f4f0',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#555'}}>{TIPI_AUTO[form.tipo]?.desc}</div>}
            <div style={s.field}><label style={s.label}>Canale</label>
              <select style={s.input} value={form.canale||'sms'} onChange={e=>setForm(f=>({...f,canale:e.target.value}))}>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="entrambi">SMS + Email</option>
                <option value="interno">Solo interno (nessun invio)</option>
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Template messaggio</label>
              <select style={s.input} value={form.template_id||''} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))}>
                <option value="">— Usa testo predefinito —</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            {form.tipo==='cambio_stato'&&(
              <div style={s.field}><label style={s.label}>Stato che attiva la regola</label>
                <select style={s.input} value={form.stato_trigger||''} onChange={e=>setForm(f=>({...f,stato_trigger:e.target.value}))}>
                  <option value="">— Tutti i cambi —</option>
                  {STATI_CAND.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            {form.tipo==='candidato_inattivo'&&(
              <div style={s.field}><label style={s.label}>Giorni di inattività</label>
                <input type="number" style={s.input} value={form.giorni_inattivita||30} min={1} onChange={e=>setForm(f=>({...f,giorni_inattivita:parseInt(e.target.value)}))}/>
              </div>
            )}
            {form.tipo==='offerta_scadenza'&&(
              <div style={s.field}><label style={s.label}>Giorni di anticipo avviso</label>
                <input type="number" style={s.input} value={form.giorni_anticipo||7} min={1} onChange={e=>setForm(f=>({...f,giorni_anticipo:parseInt(e.target.value)}))}/>
              </div>
            )}
            <div style={s.field}><label style={s.label}>Note</label>
              <textarea style={{...s.input,minHeight:60,resize:'vertical'}} value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" id="attiva" checked={form.attiva??true} onChange={e=>setForm(f=>({...f,attiva:e.target.checked}))}/>
              <label htmlFor="attiva" style={{fontSize:13,color:'#555',cursor:'pointer'}}>Regola attiva</label>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveRegola}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap:{maxWidth:1000,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem',flexWrap:'wrap'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  tabs:{display:'flex',gap:4,marginBottom:'1.25rem'},
  tab:{padding:'5px 16px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:13,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  card:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,padding:'1rem 1.25rem'},
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
