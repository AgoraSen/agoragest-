// src/pages/Utenti.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const RUOLI = ['admin','senior','base']
const RUOLO_LABEL = { admin:'Amministratore', senior:'Operatore senior', base:'Operatore base' }
const RUOLO_COLOR = {
  admin:{bg:'#FCEBEB',color:'#791F1F'},
  senior:{bg:'#EEEDFE',color:'#3C3489'},
  base:{bg:'#E6F1FB',color:'#0C447C'},
}

export default function Utenti() {
  const { profile:me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lista')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [inviteForm, setInviteForm] = useState({email:'',nome:'',cognome:'',ruolo:'base',password:''})
  const [editForm, setEditForm] = useState({})
  const [inviteMsg, setInviteMsg] = useState('')
  const [importRows, setImportRows] = useState([])
  const [importMsg, setImportMsg] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  useEffect(()=>{ loadUsers() },[])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('cognome')
    setUsers(data||[])
    setLoading(false)
  }

  async function createUser() {
    setInviteMsg('')
    const { error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: inviteForm.password,
      options: { data:{ nome:inviteForm.nome, cognome:inviteForm.cognome, ruolo:inviteForm.ruolo } }
    })
    if (error) { setInviteMsg('Errore: '+error.message); return }
    setInviteMsg("Utente creato!")
    setTimeout(()=>{ setShowAdd(false); setInviteMsg(''); loadUsers() }, 1500)
  }

  async function updateUser() {
    await supabase.from('profiles').update({
      nome:editForm.nome, cognome:editForm.cognome, ruolo:editForm.ruolo, attivo:editForm.attivo
    }).eq('id',editForm.id)
    setShowEdit(false); loadUsers()
  }

  async function toggleActive(u) {
    await supabase.from('profiles').update({attivo:!u.attivo}).eq('id',u.id); loadUsers()
  }

  function handleImportFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => parseCsv(e.target.result)
    reader.readAsText(file, 'utf-8')
  }

  function parseCsv(text) {
    const lines = text.split('\n').filter(l=>l.trim())
    if (lines.length < 2) { setImportMsg('File vuoto o senza dati.'); return }
    const header = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/["\r\ufeff]/g,''))
    const rows = []
    for (let i=1; i<lines.length; i++) {
      const vals = lines[i].split(',').map(v=>v.trim().replace(/["\r]/g,''))
      const obj = {}
      header.forEach((h,j) => obj[h] = vals[j]||'')
      const nome = obj.nome||obj.name||''
      const cognome = obj.cognome||obj.surname||''
      const email = obj.email||''
      const ruolo = ['admin','senior','base'].includes(obj.ruolo||obj.role) ? (obj.ruolo||obj.role) : 'base'
      if (nome && email) rows.push({ nome, cognome, email, ruolo })
    }
    setImportRows(rows)
    setImportMsg(rows.length > 0 ? `Trovati ${rows.length} utenti pronti per l'importazione.` : 'Nessun utente valido. Controlla che il file abbia le colonne: nome, cognome, email, ruolo')
  }

  async function confirmImport() {
    if (!importRows.length) return
    setImportLoading(true)
    let ok = 0, errors = 0
    for (const row of importRows) {
      const password = Math.random().toString(36).slice(-6) + 'Ag1!'
      const { error } = await supabase.auth.signUp({
        email: row.email, password,
        options: { data:{ nome:row.nome, cognome:row.cognome, ruolo:row.ruolo } }
      })
      if (error) errors++; else ok++
      await new Promise(r=>setTimeout(r,400))
    }
    setImportLoading(false)
    setImportMsg(`Completato: ${ok} utenti importati.${errors>0?` ${errors} errori (email già esistenti o non valide).`:''}`)
    setImportRows([])
    setTimeout(()=>{ loadUsers() }, 2000)
  }

  function downloadTemplate() {
    const csv = 'nome,cognome,email,ruolo\nMario,Rossi,mario.rossi@agora.it,base\nGiulia,Bianchi,giulia.bianchi@agora.it,senior\nLuca,Verdi,luca.verdi@agora.it,admin'
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='template_utenti.csv'; a.click()
  }

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Gestione utenti</h2>
        <button style={s.btnPrimary} onClick={()=>{setInviteForm({email:'',nome:'',cognome:'',ruolo:'base',password:''});setShowAdd(true)}}>
          + Nuovo utente
        </button>
      </div>

      <div style={s.tabs}>
        {[['lista','Lista utenti'],['import','Importa da file']].map(([id,label])=>(
          <div key={id} style={{...s.tab,...(tab===id?s.tabActive:{})}} onClick={()=>setTab(id)}>{label}</div>
        ))}
      </div>

      {tab==='lista' && (
        <>
          <div style={s.info}>
            <strong>Operatore base</strong> — vede solo i candidati assegnati a sé. &nbsp;
            <strong>Operatore senior</strong> e <strong>Amministratore</strong> — vedono tutto.
          </div>
          {loading
            ?<div style={s.empty}>Caricamento...</div>
            :<div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>
                  {['','Nome','Email','Ruolo','Stato','Azioni'].map(h=><th key={h} style={s.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id}>
                      <td style={s.td}><div style={{...s.avatar,opacity:u.attivo?1:.4}}>{u.nome?.[0]}{u.cognome?.[0]}</div></td>
                      <td style={s.td}><strong>{u.nome} {u.cognome}</strong>{u.id===me?.id&&<span style={s.youBadge}>tu</span>}</td>
                      <td style={{...s.td,color:'#888'}}>{u.email}</td>
                      <td style={s.td}><span style={{...s.badge,...(RUOLO_COLOR[u.ruolo]||RUOLO_COLOR.base)}}>{RUOLO_LABEL[u.ruolo]||u.ruolo}</span></td>
                      <td style={s.td}><span style={{fontSize:12,color:u.attivo?'#27500A':'#aaa'}}>{u.attivo?'Attivo':'Disattivato'}</span></td>
                      <td style={s.td}>
                        <div style={{display:'flex',gap:6}}>
                          <button style={s.btnSmall} onClick={()=>{setEditForm(u);setShowEdit(true)}}>Modifica</button>
                          {u.id!==me?.id&&(
                            <button style={{...s.btnSmall,color:u.attivo?'#b91c1c':'#27500A'}} onClick={()=>toggleActive(u)}>
                              {u.attivo?'Disattiva':'Riattiva'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </>
      )}

      {tab==='import' && (
        <div style={{maxWidth:700}}>
          <div style={s.info}>
            Importa più operatori da un file CSV. Ogni utente riceverà una password temporanea generata automaticamente — potranno cambiarla al primo accesso.
          </div>
          <div style={{display:'flex',gap:8,marginBottom:'1rem',alignItems:'center',flexWrap:'wrap'}}>
            <button style={s.btnSecondary} onClick={downloadTemplate}>↓ Scarica template CSV</button>
            <span style={{fontSize:12,color:'#888'}}>Colonne: nome, cognome, email, ruolo (admin/senior/base)</span>
          </div>
          <div style={s.dropZone}
            onClick={()=>document.getElementById('import-file').click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();handleImportFile(e.dataTransfer.files[0])}}>
            <div style={{fontSize:28,marginBottom:8}}>📂</div>
            <div style={{fontSize:14,fontWeight:500,color:'#1a1a1a',marginBottom:4}}>Trascina il file CSV qui oppure clicca per selezionarlo</div>
            <div style={{fontSize:12,color:'#888'}}>Formato supportato: .csv</div>
            <input id="import-file" type="file" accept=".csv,.txt" style={{display:'none'}} onChange={e=>handleImportFile(e.target.files[0])}/>
          </div>

          {importMsg&&(
            <div style={{...s.msgBox, ...(importMsg.includes('Errore')||importMsg.includes('vuoto')||importMsg.includes('Nessun')?s.msgErr:s.msgOk)}}>
              {importMsg}
            </div>
          )}

          {importRows.length>0&&(
            <div style={{marginTop:'1rem'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>Anteprima — {importRows.length} utenti</div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead><tr>{['Nome','Cognome','Email','Ruolo'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {importRows.slice(0,8).map((r,i)=>(
                      <tr key={i}>
                        <td style={s.td}>{r.nome}</td>
                        <td style={s.td}>{r.cognome}</td>
                        <td style={s.td}>{r.email}</td>
                        <td style={s.td}><span style={{...s.badge,...(RUOLO_COLOR[r.ruolo]||RUOLO_COLOR.base)}}>{RUOLO_LABEL[r.ruolo]||r.ruolo}</span></td>
                      </tr>
                    ))}
                    {importRows.length>8&&<tr><td colSpan={4} style={{...s.td,color:'#888',textAlign:'center',fontStyle:'italic'}}>...e altri {importRows.length-8} utenti</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button style={s.btnSecondary} onClick={()=>{setImportRows([]);setImportMsg('')}}>Annulla</button>
                <button style={s.btnPrimary} onClick={confirmImport} disabled={importLoading}>
                  {importLoading?`Importazione in corso...`:`Importa ${importRows.length} utenti`}
                </button>
              </div>
              {importLoading&&<div style={{fontSize:12,color:'#888',marginTop:6}}>Attendere — si evitano errori di rate limit inviando un utente alla volta...</div>}
            </div>
          )}
        </div>
      )}

      {showAdd&&(
        <>
          <div style={s.overlay} onClick={()=>setShowAdd(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Nuovo utente</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['Nome','nome'],['Cognome','cognome']].map(([l,k])=>(
                <div key={k} style={s.field}><label style={s.label}>{l}</label>
                  <input style={s.input} value={inviteForm[k]} onChange={e=>setInviteForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={s.field}><label style={s.label}>Email</label>
              <input type="email" style={s.input} value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))}/>
            </div>
            <div style={s.field}><label style={s.label}>Password temporanea</label>
              <input type="password" style={s.input} value={inviteForm.password} onChange={e=>setInviteForm(f=>({...f,password:e.target.value}))} placeholder="Minimo 6 caratteri"/>
            </div>
            <div style={s.field}><label style={s.label}>Ruolo</label>
              <select style={s.input} value={inviteForm.ruolo} onChange={e=>setInviteForm(f=>({...f,ruolo:e.target.value}))}>
                {RUOLI.map(r=><option key={r} value={r}>{RUOLO_LABEL[r]}</option>)}
              </select>
            </div>
            {inviteMsg&&<div style={{...s.msgBox,...(inviteMsg.includes('Errore')?s.msgErr:s.msgOk)}}>{inviteMsg}</div>}
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowAdd(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={createUser}>Crea utente</button>
            </div>
          </div>
        </>
      )}

      {showEdit&&(
        <>
          <div style={s.overlay} onClick={()=>setShowEdit(false)}/>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Modifica utente</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['Nome','nome'],['Cognome','cognome']].map(([l,k])=>(
                <div key={k} style={s.field}><label style={s.label}>{l}</label>
                  <input style={s.input} value={editForm[k]||''} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
            </div>
            <div style={s.field}><label style={s.label}>Ruolo</label>
              <select style={s.input} value={editForm.ruolo} onChange={e=>setEditForm(f=>({...f,ruolo:e.target.value}))}>
                {RUOLI.map(r=><option key={r} value={r}>{RUOLO_LABEL[r]}</option>)}
              </select>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={()=>setShowEdit(false)}>Annulla</button>
              <button style={s.btnPrimary} onClick={updateUser}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  wrap:{maxWidth:900,margin:'0 auto'},
  topbar:{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'},
  title:{fontSize:20,fontWeight:600,color:'#1a1a1a',flex:1,margin:0},
  tabs:{display:'flex',gap:4,marginBottom:'1.25rem'},
  tab:{padding:'5px 16px',border:'0.5px solid #e8e5e0',borderRadius:20,fontSize:13,cursor:'pointer',color:'#888'},
  tabActive:{background:'#1a3a5c',color:'#fff',borderColor:'#1a3a5c'},
  info:{background:'#f0f7ff',border:'0.5px solid #bdd6ee',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#1a3a5c',marginBottom:'1rem'},
  tableWrap:{background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:12,overflow:'hidden'},
  table:{width:'100%',borderCollapse:'collapse',fontSize:13},
  th:{padding:'9px 12px',textAlign:'left',color:'#888',fontWeight:400,borderBottom:'0.5px solid #f0ede8',background:'#fafaf8',fontSize:12},
  td:{padding:'10px 12px',borderBottom:'0.5px solid #f5f3ee',color:'#1a1a1a',verticalAlign:'middle'},
  avatar:{width:32,height:32,borderRadius:'50%',background:'#1a3a5c',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600},
  badge:{display:'inline-block',fontSize:11,padding:'2px 8px',borderRadius:20},
  youBadge:{marginLeft:6,background:'#f0ede8',color:'#888',fontSize:10,padding:'1px 6px',borderRadius:10},
  btnSmall:{background:'#fff',border:'0.5px solid #d8d5ce',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',color:'#333'},
  empty:{padding:'2rem',textAlign:'center',color:'#aaa'},
  dropZone:{border:'1.5px dashed #d8d5ce',borderRadius:12,padding:'2.5rem',textAlign:'center',cursor:'pointer',background:'#fafaf8'},
  msgBox:{borderRadius:8,padding:'10px 14px',fontSize:13,marginTop:12},
  msgOk:{background:'#EAF3DE',border:'0.5px solid #1D9E75',color:'#27500A'},
  msgErr:{background:'#FCEBEB',border:'0.5px solid #E24B4A',color:'#791F1F'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:20},
  modal:{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',border:'0.5px solid #e8e5e0',borderRadius:14,padding:'1.5rem',zIndex:40,width:'min(460px,96vw)',maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10},
  modalTitle:{fontSize:16,fontWeight:600,color:'#1a1a1a',margin:0},
  modalActions:{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4},
  field:{display:'flex',flexDirection:'column',gap:4},
  label:{fontSize:12,color:'#888'},
  input:{padding:'8px 10px',border:'0.5px solid #d8d5ce',borderRadius:8,fontSize:13,background:'#fafaf8',color:'#1a1a1a',outline:'none',width:'100%'},
  btnPrimary:{background:'#1a3a5c',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,cursor:'pointer',fontWeight:500},
  btnSecondary:{background:'#fff',color:'#333',border:'0.5px solid #d8d5ce',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'},
}
