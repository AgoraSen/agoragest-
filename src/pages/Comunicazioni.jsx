// src/pages/Comunicazioni.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TIPI = ['convocazione','promemoria','corso','inadempiente','altro']
const TIPO_LABEL = { convocazione:'Convocazione', promemoria:'Promemoria', corso:'Corso', inadempiente:'Inadempiente', altro:'Altro' }
const TIPO_COLOR = { convocazione:{bg:'#E6F1FB',color:'#0C447C'}, promemoria:{bg:'#EEEDFE',color:'#3C3489'}, corso:{bg:'#EAF3DE',color:'#27500A'}, inadempiente:{bg:'#FCEBEB',color:'#791F1F'}, altro:{bg:'#F1EFE8',color:'#444441'} }
const CANALI = ['sms','email']

export default function Comunicazioni() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('invia')
  const [templates, setTemplates] = useState([])
  const [candidati, setCandidati] = useState([])
  const [logInvii, setLogInvii] = useState([])
  const [selectedTpl, setSelectedTpl] = useState(null)
  const [canale, setCanale] = useState('sms')
  const [selectedCands, setSelectedCands] = useState(new Set())
  const [filteredCands, setFilteredCands] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showTplModal, setShowTplModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showRicevuta, setShowRicevuta] = useState(false)
  const [ricevutaTxt, setRicevutaTxt] = useState('')
  const [tplForm, setTplForm] = useState({})
  const [editTplId, setEditTplId] = useState(null)
  const [sendVars, setSendVars] = useState({ data:'', ora:'09:00', sala:'Via Cimabue 21, Senigallia', corso:'' })
  const [logQ, setLogQ] = useState('')
  const [logCanale, setLogCanale] = useState('')
  const [nlForm, setNlForm] = useState({ oggetto:'', testo:'', gruppo:'tutti' })
  const [nlPreview, setNlPreview] = useState('')
  const [stats, setStats] = useState({ oggi:0, tot:0, cons:0 })

  useEffect(() => { loadTemplates(); loadCandidati(); loadLog() }, [])

  useEffect(() => {
    const lower = searchQ.toLowerCase()
    setFilteredCands(candidati.filter(c =>
      (!lower || (c.nome+c.cognome+c.cf).toLowerCase().includes(lower)) &&
      (!filterStato || c.stato === filterStato)
    ))
  }, [searchQ, filterStato, candidati])

  async function loadTemplates() {
    const { data } = await supabase.from('templates').select('*').order('nome')
    setTemplates(data||[])
  }

  async function loadCandidati() {
    const { data } = await supabase.from('candidati').select('id,nome,cognome,cf,email,tel,stato').order('cognome').limit(500)
    setCandidati(data||[])
    setFilteredCands(data||[])
  }

  async function loadLog() {
    const { data } = await supabase.from('log_invii').select('*').order('created_at', { ascending:false }).limit(200)
    setLogInvii(data||[])
    const oggi = new Date().toISOString().slice(0,10)
    setStats({
      oggi: (data||[]).filter(l => l.created_at?.slice(0,10) === oggi).length,
      tot: (data||[]).length,
      cons: (data||[]).filter(l => l.stato === 'Inviato').length,
    })
  }

  function fillVars(testo, c) {
    return (testo||'')
      .replace(/{{nome}}/g, c.nome||'')
      .replace(/{{cognome}}/g, c.cognome||'')
      .replace(/{{cf}}/g, c.cf||'')
      .replace(/{{data_appuntamento}}/g, sendVars.data ? fmtDate(sendVars.data) : '{{data_appuntamento}}')
      .replace(/{{ora_appuntamento}}/g, sendVars.ora||'')
      .replace(/{{sala}}/g, sendVars.sala||'')
      .replace(/{{sede}}/g, sendVars.sala||'')
      .replace(/{{operatore}}/g, `${profile?.nome} ${profile?.cognome}`)
      .replace(/{{nome_corso}}/g, sendVars.corso||'')
  }

  function fmtDate(s) { if(!s)return ''; const[y,m,d]=s.split('-'); return `${d}/${m}/${y}` }
  function fmtTs(s) { if(!s)return '—'; return new Date(s).toLocaleString('it-IT') }

  async function sendMessages() {
    if (!selectedTpl || selectedCands.size === 0) return
    const tpl = templates.find(t => t.id === selectedTpl)
    if (!tpl) return
    const canali = canale === 'entrambi' ? ['sms','email'] : [canale]
    const rows = []
    selectedCands.forEach(cid => {
      const c = candidati.find(x => x.id === cid)
      if (!c) return
      canali.forEach(ch => {
        rows.push({
          candidato_id: c.id,
          candidato_nome: `${c.nome} ${c.cognome}`,
          candidato_cf: c.cf,
          template_nome: tpl.nome,
          canale: ch,
          testo: fillVars(tpl.testo, c),
          oggetto: tpl.oggetto ? fillVars(tpl.oggetto, c) : null,
          stato: 'Inviato',
          operatore_id: profile?.id,
          operatore_nome: `${profile?.nome} ${profile?.cognome}`,
          trigger_tipo: 'manuale',
        })
      })
    })
    await supabase.from('log_invii').insert(rows)
    // genera ricevuta
    const now = new Date().toLocaleString('it-IT')
    let txt = `RICEVUTA DI INVIO — AGORÀ SOCIETÀ COOPERATIVA\n${'─'.repeat(50)}\nData e ora: ${now}\nOperatore: ${profile?.nome} ${profile?.cognome}\nCanale: ${canale.toUpperCase()}\nTemplate: ${tpl.nome}\nDestinatari: ${selectedCands.size}\n${'─'.repeat(50)}\n\n`
    rows.forEach((r,i) => {
      txt += `${i+1}. ${r.candidato_nome} — CF: ${r.candidato_cf}\n`
      txt += `   Canale: ${r.canale.toUpperCase()}\n`
      txt += `   Testo: "${r.testo}"\n\n`
    })
    txt += `${'─'.repeat(50)}\nFine ricevuta`
    setRicevutaTxt(txt)
    setShowSendModal(false)
    setShowRicevuta(true)
    loadLog()
    setSelectedCands(new Set())
  }

  async function saveTpl() {
    if (!tplForm.nome || !tplForm.testo) return
    if (editTplId) {
      await supabase.from('templates').update(tplForm).eq('id', editTplId)
    } else {
      await supabase.from('templates').insert([tplForm])
    }
    setShowTplModal(false)
    loadTemplates()
  }

  async function deleteTpl(id) {
    if (!window.confirm('Eliminare questo template?')) return
    await supabase.from('templates').delete().eq('id', id)
    loadTemplates()
  }

  async function sendNewsletter() {
    if (!nlForm.oggetto || !nlForm.testo) return
    const dest = candidati.filter(c => c.email && (
      nlForm.gruppo === 'tutti' || c.stato === {attesa:'In attesa',formazione:'In formazione',collocato:'Collocato'}[nlForm.gruppo]
    ))
    const rows = dest.map(c => ({
      candidato_id: c.id,
      candidato_nome: `${c.nome} ${c.cognome}`,
      candidato_cf: c.cf,
      template_nome: `Newsletter: ${nlForm.oggetto}`,
      canale: 'email',
      testo: nlForm.testo.replace(/{{nome}}/g, c.nome).replace(/{{cognome}}/g, c.cognome),
      oggetto: nlForm.oggetto,
      stato: 'Inviato',
      operatore_id: profile?.id,
      operatore_nome: `${profile?.nome} ${profile?.cognome}`,
      trigger_tipo: 'newsletter',
    }))
    await supabase.from('log_invii').insert(rows)
    alert(`Newsletter inviata a ${dest.length} destinatari!`)
    loadLog()
  }

  function downloadRicevuta() {
    const blob = new Blob([ricevutaTxt], { type:'text/plain;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ricevuta_invio.txt'; a.click()
  }

  function exportLogCsv() {
    const header = 'Data,Nome,CF,Canale,Template,Stato,Operatore'
    const rows = logInvii.map(l => [fmtTs(l.created_at),l.candidato_nome,l.candidato_cf,l.canale,l.template_nome,l.stato,l.operatore_nome].map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(','))
    const blob = new Blob([header+'\n'+rows.join('\n')], { type:'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'log_invii.csv'; a.click()
  }

  const filteredLog = logInvii.filter(l =>
    (!logQ || (l.candidato_nome+l.candidato_cf).toLowerCase().includes(logQ.toLowerCase())) &&
    (!logCanale || l.canale === logCanale)
  )

  const tpl = templates.find(t => t.id === selectedTpl)
  const previewTesto = tpl && candidati[0] ? fillVars(tpl.testo, candidati[0]) : 'Seleziona un template per vedere l\'anteprima.'

  return (
    <div style={s.wrap}>
      <div style={s.topbar}><h2 style={s.title}>Comunicazioni</h2></div>

      <div style={s.tabs}>
        {[['invia','Invia messaggi'],['template','Template'],['log','Log + Ricevute'],['newsletter','Newsletter']].map(([id,label])=>(
          <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>

      {/* INVIA */}
      {tab==='invia' && (
        <div style={s.grid2}>
          <div>
            <div style={s.sectionLabel}>1. Scegli template</div>
            {templates.map(t=>(
              <div key={t.id} style={{...s.tplCard,...(selectedTpl===t.id?s.tplCardActive:{})}} onClick={()=>setSelectedTpl(t.id)}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{...s.badge,...TIPO_COLOR[t.tipo]}}>{TIPO_LABEL[t.tipo]}</span>
                  <span style={{fontSize:14,fontWeight:500,color:'#1a1a1a'}}>{t.nome}</span>
                </div>
                <div style={{fontSize:12,color:'#888',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.testo?.substring(0,70)}…</div>
              </div>
            ))}
            <div style={s.field}>
              <label style={s.label}>Canale</label>
              <select style={s.input} value={canale} onChange={e=>setCanale(e.target.value)}>
                <option value="sms">SMS (tracciato)</option>
                <option value="email">Email</option>
                <option value="entrambi">SMS + Email</option>
              </select>
            </div>

            <div style={s.sectionLabel}>2. Seleziona destinatari</div>
            <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
              <input style={{...s.input,flex:1,minWidth:120}} placeholder="Cerca..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
              <select style={s.input} value={filterStato} onChange={e=>setFilterStato(e.target.value)}>
                <option value="">Tutti</option>
                <option>In attesa</option><option>Colloquio fissato</option>
                <option>In formazione</option><option>Collocato</option>
              </select>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:6}}>
              <button style={s.btnSmall} onClick={()=>setSelectedCands(new Set(filteredCands.map(c=>c.id)))}>Seleziona tutti</button>
              <button style={s.btnSmall} onClick={()=>setSelectedCands(new Set())}>Deseleziona</button>
              <span style={{fontSize:12,color:'#888',alignSelf:'center'}}>{selectedCands.size} selezionati</span>
            </div>
            <div style={{maxHeight:220,overflowY:'auto',border:'0.5px solid #e8e5e0',borderRadius:8}}>
              {filteredCands.map(c=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderBottom:'0.5px solid #f5f3ee',fontSize:13,cursor:'pointer'}} onClick={()=>{const ns=new Set(selectedCands);ns.has(c.id)?ns.delete(c.id):ns.add(c.id);setSelectedCands(ns)}}>
                  <input type="checkbox" readOnly checked={selectedCands.has(c.id)} style={{width:14,height:14,flexShrink:0}}/>
                  <span style={{flex:1}}>{c.nome} {c.cognome}</span>
                  <span style={{fontSize:11,color:'#aaa'}}>{c.tel||c.email||'—'}</span>
                </div>
              ))}
            </div>
            <button style={{...s.btnPrimary,width:'100%',marginTop:12,padding:9}} onClick={()=>setShowSendModal(true)}>
              Invia ai selezionati →
            </button>
          </div>

          <div>
            <div style={s.sectionLabel}>Anteprima</div>
            {tpl?.oggetto && <div style={{fontSize:12,color:'#888',marginBottom:6}}>Oggetto: {tpl.oggetto}</div>}
            <div style={s.previewBox}>{previewTesto}</div>
            <div style={{fontSize:11,color:'#aaa',marginTop:6}}>Anteprima con primo candidato in lista.</div>
            <div style={{marginTop:20}}>
              <div style={s.sectionLabel}>Statistiche oggi</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {[['Inviati oggi',stats.oggi],['Totale log',stats.tot],['Consegnati',stats.cons]].map(([l,v])=>(
                  <div key={l} style={{background:'#f5f4f0',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:11,color:'#888'}}>{l}</div>
                    <div style={{fontSize:22,fontWeight:600,color:'#1a3a5c'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE */}
      {tab==='template' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div style={{fontSize:13,color:'#888'}}>Variabili: <code style={{background:'#f0f7ff',padding:'1px 5px',borderRadius:4,fontSize:12}}>{'{{nome}} {{cognome}} {{cf}} {{data_appuntamento}} {{ora_appuntamento}} {{sala}} {{operatore}} {{nome_corso}}'}</code></div>
            <button style={s.btnPrimary} onClick={()=>{setEditTplId(null);setTplForm({tipo:'convocazione'});setShowTplModal(true)}}>+ Nuovo template</button>
          </div>
          {templates.map(t=>(
            <div key={t.id} style={s.card}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{...s.badge,...TIPO_COLOR[t.tipo]}}>{TIPO_LABEL[t.tipo]}</span>
                <span style={{fontSize:15,fontWeight:600,color:'#1a1a1a',flex:1}}>{t.nome}</span>
                <button style={s.btnSmall} onClick={()=>{setEditTplId(t.id);setTplForm({nome:t.nome,tipo:t.tipo,oggetto:t.oggetto||'',testo:t.testo});setShowTplModal(true)}}>Modifica</button>
                <button style={{...s.btnSmall,color:'#b91c1c'}} onClick={()=>deleteTpl(t.id)}>Elimina</button>
              </div>
              {t.oggetto && <div style={{fontSize:12,color:'#888',marginBottom:4}}>Oggetto: {t.oggetto}</div>}
              <div style={s.previewBox}>{t.testo}</div>
            </div>
          ))}
        </div>
      )}

      {/* LOG */}
      {tab==='log' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
            <input style={{...s.input,flex:1,minWidth:140}} placeholder="Cerca nome, CF..." value={logQ} onChange={e=>setLogQ(e.target.value)}/>
            <select style={s.input} value={logCanale} onChange={e=>setLogCanale(e.target.value)}>
              <option value="">Tutti i canali</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <button style={s.btnSuccess} onClick={exportLogCsv}>↓ CSV</button>
          </div>
          <div style={{border:'0.5px solid #e8e5e0',borderRadius:12,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'130px 1fr 90px 70px 70px',gap:6,padding:'8px 12px',background:'#fafaf8',fontSize:11,color:'#888'}}>
              <div>Data e ora</div><div>Candidato</div><div>Template</div><div>Canale</div><div>Stato</div>
            </div>
            <div style={{maxHeight:400,overflowY:'auto'}}>
              {filteredLog.length === 0
                ? <div style={{padding:20,textAlign:'center',fontSize:13,color:'#aaa'}}>Nessun invio registrato.</div>
                : filteredLog.map(l=>(
                  <div key={l.id} style={{display:'grid',gridTemplateColumns:'130px 1fr 90px 70px 70px',gap:6,padding:'8px 12px',borderTop:'0.5px solid #f5f3ee',fontSize:12,alignItems:'center',cursor:'pointer'}}
                    onClick={()=>{
                      setRicevutaTxt(`RICEVUTA — AGORÀ\n${'─'.repeat(40)}\nData: ${fmtTs(l.created_at)}\nOperatore: ${l.operatore_nome}\nCanale: ${l.canale?.toUpperCase()}\nTemplate: ${l.template_nome}\n${'─'.repeat(40)}\nDestinatario: ${l.candidato_nome}\nCF: ${l.candidato_cf}\nStato: ${l.stato}\n${l.oggetto?'Oggetto: '+l.oggetto+'\n':''}\nTesto:\n"${l.testo}"\n${'─'.repeat(40)}\nFine ricevuta`)
                      setShowRicevuta(true)
                    }}>
                    <div style={{color:'#888'}}>{fmtTs(l.created_at)}</div>
                    <div><strong>{l.candidato_nome}</strong><br/><span style={{color:'#aaa'}}>{l.candidato_cf}</span></div>
                    <div style={{color:'#888',fontSize:11}}>{l.template_nome?.substring(0,20)}</div>
                    <div><span style={{...s.badge,...(l.canale==='sms'?{bg:'#FAEEDA',color:'#633806'}:{bg:'#E6F1FB',color:'#0C447C'})}}>{l.canale?.toUpperCase()}</span></div>
                    <div><span style={{...s.badge,...(l.stato==='Inviato'?{bg:'#EAF3DE',color:'#27500A'}:{bg:'#FCEBEB',color:'#791F1F'})}}>{l.stato}</span></div>
                  </div>
                ))
              }
            </div>
          </div>
          <div style={{fontSize:12,color:'#888',marginTop:8}}>{filteredLog.length} invii nel log</div>
        </div>
      )}

      {/* NEWSLETTER */}
      {tab==='newsletter' && (
        <div style={s.grid2}>
          <div>
            <div style={s.field}><label style={s.label}>Oggetto</label>
              <input style={s.input} value={nlForm.oggetto} onChange={e=>setNlForm(f=>({...f,oggetto:e.target.value}))} placeholder="Es. Nuovi corsi disponibili — Agorà"/>
            </div>
            <div style={s.field}><label style={s.label}>Testo</label>
              <textarea style={{...s.input,minHeight:160,resize:'vertical'}} value={nlForm.testo} onChange={e=>setNlForm(f=>({...f,testo:e.target.value}))} placeholder={'Gentile {{nome}},\n\nscriviamo per informarla...'}/>
            </div>
            <div style={s.field}><label style={s.label}>Destinatari</label>
              <select style={s.input} value={nlForm.gruppo} onChange={e=>setNlForm(f=>({...f,gruppo:e.target.value}))}>
                <option value="tutti">Tutti i candidati con email</option>
                <option value="attesa">Solo: In attesa</option>
                <option value="formazione">Solo: In formazione</option>
                <option value="collocato">Solo: Collocati</option>
              </select>
            </div>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button style={s.btnPrimary} onClick={sendNewsletter}>Invia newsletter →</button>
              <button style={s.btnSecondary} onClick={()=>setNlPreview(nlForm.testo.replace(/{{nome}}/g,candidati[0]?.nome||'Nome').replace(/{{cognome}}/g,candidati[0]?.cognome||'Cognome'))}>Anteprima</button>
            </div>
          </div>
          <div>
            <div style={s.sectionLabel}>Anteprima</div>
            <div style={s.previewBox}>{nlPreview||'Clicca "Anteprima" per vedere il testo compilato.'}</div>
            <div style={{fontSize:12,color:'#888',marginTop:8}}>
              Destinatari con email: {candidati.filter(c=>c.email&&(nlForm.gruppo==='tutti'||c.stato==={attesa:'In attesa',formazione:'In formazione',collocato:'Collocato'}[nlForm.gruppo])).length} candidati
            </div>
          </div>
        </div>
      )}

      {/* Modal Send confirm */}
      {showSendModal && (
        <>
          <div style={s.overlay} onClick={()=>setShowSendModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Conferma invio</h3>
            <div style={{background:'#f5f4f0',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#555',marginBottom:4}}>
              <strong>Template:</strong> {tpl?.nome}<br/>
              <strong>Canale:</strong> {canale.toUpperCase()}<br/>
              <strong>Destinatari:</strong> {selectedCands.size} candidati
            </div>
            <div style={s.field}><label style={s.label}>Data appuntamento</label>
              <input type="date" style={s.input} value={sendVars.data} onChange={e=>setSendVars(v=>({...v,data:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Ora appuntamento</label>
              <input type="time" style={s.input} value={sendVars.ora} onChange={e=>setSendVars(v=>({...v,ora:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Sala / Sede</label>
              <input style={s.input} value={sendVars.sala} onChange={e=>setSendVars(v=>({...v,sala:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Nome corso (se applicabile)</label>
              <input style={s.input} value={sendVars.corso} onChange={e=>setSendVars(v=>({...v,corso:e.target.value}))} placeholder="Es. Corso Excel avanzato"/>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowSendModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={sendMessages}>Conferma e invia</button>
            </div>
          </div>
        </>
      )}

      {/* Modal Template */}
      {showTplModal && (
        <>
          <div style={s.overlay} onClick={()=>setShowTplModal(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editTplId?'Modifica template':'Nuovo template'}</h3>
            <div style={s.field}><label style={s.label}>Nome</label>
              <input style={s.input} value={tplForm.nome||''} onChange={e=>setTplForm(f=>({...f,nome:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Tipo</label>
              <select style={s.input} value={tplForm.tipo||'altro'} onChange={e=>setTplForm(f=>({...f,tipo:e.target.value}))}>
                {TIPI.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Oggetto email (opzionale)</label>
              <input style={s.input} value={tplForm.oggetto||''} onChange={e=>setTplForm(f=>({...f,oggetto:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Testo</label>
              <textarea style={{...s.input,minHeight:120,resize:'vertical'}} value={tplForm.testo||''} onChange={e=>setTplForm(f=>({...f,testo:e.target.value}))}/>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowTplModal(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={saveTpl}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Ricevuta */}
      {showRicevuta && (
        <>
          <div style={s.overlay} onClick={()=>setShowRicevuta(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Ricevuta di invio</h3>
            <pre style={{...s.previewBox,fontFamily:'monospace',fontSize:11,maxHeight:300,overflowY:'auto'}}>{ricevutaTxt}</pre>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>navigator.clipboard?.writeText(ricevutaTxt)}>Copia testo</button>
              <button style={s.btnSuccess} onClick={downloadRicevuta}>↓ Scarica .txt</button>
              <button style={s.btnPrimary} onClick={()=>setShowRicevuta(false)}>Chiudi</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap: { maxWidth:1080, margin:'0 auto' },
  topbar: { display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' },
  title: { fontSize:20, fontWeight:600, color:'#1a1a1a', margin:0 },
  tabs: { display:'flex', gap:4, marginBottom:'1.25rem', flexWrap:'wrap' },
  tab: { padding:'5px 16px', border:'0.5px solid #e8e5e0', borderRadius:20, fontSize:13, cursor:'pointer', color:'#888' },
  tabActive: { background:'#1a3a5c', color:'#fff', borderColor:'#1a3a5c' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' },
  sectionLabel: { fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 },
  tplCard: { background:'#fff', border:'0.5px solid #e8e5e0', borderRadius:8, padding:'10px 12px', marginBottom:8, cursor:'pointer' },
  tplCardActive: { borderColor:'#1a3a5c', background:'#f0f7ff' },
  card: { background:'#fff', border:'0.5px solid #e8e5e0', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10 },
  previewBox: { background:'#f5f4f0', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#1a1a1a', whiteSpace:'pre-wrap', lineHeight:1.6, border:'0.5px solid #e8e5e0', minHeight:60 },
  badge: { display:'inline-block', fontSize:11, padding:'2px 8px', borderRadius:20 },
  field: { display:'flex', flexDirection:'column', gap:4, marginBottom:10 },
  label: { fontSize:12, color:'#888' },
  input: { padding:'8px 10px', border:'0.5px solid #d8d5ce', borderRadius:8, fontSize:13, background:'#fafaf8', color:'#1a1a1a', outline:'none', width:'100%' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.18)', zIndex:20 },
  modal: { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', border:'0.5px solid #e8e5e0', borderRadius:14, padding:'1.5rem', zIndex:30, width:'min(500px,96vw)', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 },
  modalTitle: { fontSize:16, fontWeight:600, color:'#1a1a1a', margin:0 },
  modalActions: { display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 },
  btnPrimary: { background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, cursor:'pointer', fontWeight:500 },
  btnSecondary: { background:'#fff', color:'#333', border:'0.5px solid #d8d5ce', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer' },
  btnSuccess: { background:'#EAF3DE', color:'#27500A', border:'0.5px solid #27500A', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer' },
  btnSmall: { background:'#fff', border:'0.5px solid #d8d5ce', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#333' },
}
