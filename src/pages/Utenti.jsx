// src/pages/Utenti.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const RUOLI = ['admin','senior','base']
const RUOLO_LABEL = { admin: 'Amministratore', senior: 'Operatore senior', base: 'Operatore base' }
const RUOLO_COLOR = {
  admin: { bg: '#FCEBEB', color: '#791F1F' },
  senior: { bg: '#EEEDFE', color: '#3C3489' },
  base: { bg: '#E6F1FB', color: '#0C447C' },
}

export default function Utenti() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', nome: '', cognome: '', ruolo: 'base', password: '' })
  const [inviteMsg, setInviteMsg] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('cognome')
    setUsers(data || [])
    setLoading(false)
  }

  async function createUser() {
    setInviteMsg('')
    // Usa signUp di Supabase — in produzione usare Admin API o invite link
    const { error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: inviteForm.password,
      options: {
        data: {
          nome: inviteForm.nome,
          cognome: inviteForm.cognome,
          ruolo: inviteForm.ruolo,
        }
      }
    })
    if (error) { setInviteMsg('Errore: ' + error.message); return }
    setInviteMsg("Utente creato! Ha ricevuto un\u0027email di conferma.")
    setTimeout(() => { setShowInvite(false); setInviteMsg(''); loadUsers() }, 2000)
  }

  async function updateUser() {
    await supabase.from('profiles').update({
      nome: editForm.nome,
      cognome: editForm.cognome,
      ruolo: editForm.ruolo,
      attivo: editForm.attivo,
    }).eq('id', editForm.id)
    setShowEdit(false)
    loadUsers()
  }

  async function toggleActive(u) {
    await supabase.from('profiles').update({ attivo: !u.attivo }).eq('id', u.id)
    loadUsers()
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <h2 style={styles.title}>Gestione utenti</h2>
        <button style={styles.btnPrimary} onClick={() => { setInviteForm({ email:'', nome:'', cognome:'', ruolo:'base', password:'' }); setShowInvite(true) }}>
          + Nuovo utente
        </button>
      </div>

      <div style={styles.info}>
        Gli utenti con ruolo <strong>Operatore base</strong> vedono solo i candidati assegnati a loro.
        Gli <strong>Operatori senior</strong> e gli <strong>Amministratori</strong> vedono tutto.
      </div>

      {loading
        ? <div style={styles.empty}>Caricamento...</div>
        : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['', 'Nome', 'Email', 'Ruolo', 'Stato', 'Azioni'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ ...styles.avatar, opacity: u.attivo ? 1 : 0.4 }}>
                        {u.nome[0]}{u.cognome[0]}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong>{u.nome} {u.cognome}</strong>
                      {u.id === me?.id && <span style={styles.youBadge}>tu</span>}
                    </td>
                    <td style={{ ...styles.td, color: '#888' }}>{u.email}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...RUOLO_COLOR[u.ruolo] }}>
                        {RUOLO_LABEL[u.ruolo]}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: u.attivo ? '#27500A' : '#aaa' }}>
                        {u.attivo ? 'Attivo' : 'Disattivato'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={styles.btnSmall} onClick={() => { setEditForm(u); setShowEdit(true) }}>
                          Modifica
                        </button>
                        {u.id !== me?.id && (
                          <button
                            style={{ ...styles.btnSmall, color: u.attivo ? '#b91c1c' : '#27500A' }}
                            onClick={() => toggleActive(u)}
                          >
                            {u.attivo ? 'Disattiva' : 'Riattiva'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal nuovo utente */}
      {showInvite && (
        <>
          <div style={styles.overlay} onClick={() => setShowInvite(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Nuovo utente</h3>
            <div style={styles.grid2}>
              {[['Nome','nome'],['Cognome','cognome']].map(([l,k]) => (
                <div key={k} style={styles.field}>
                  <label style={styles.label}>{l}</label>
                  <input style={styles.input} value={inviteForm[k]} onChange={e => setInviteForm(f => ({...f, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={styles.field}><label style={styles.label}>Email</label>
              <input type="email" style={styles.input} value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div style={styles.field}><label style={styles.label}>Password temporanea</label>
              <input type="password" style={styles.input} value={inviteForm.password} onChange={e => setInviteForm(f => ({...f, password: e.target.value}))} placeholder="Minimo 6 caratteri" />
            </div>
            <div style={styles.field}><label style={styles.label}>Ruolo</label>
              <select style={styles.input} value={inviteForm.ruolo} onChange={e => setInviteForm(f => ({...f, ruolo: e.target.value}))}>
                {RUOLI.map(r => <option key={r} value={r}>{RUOLO_LABEL[r]}</option>)}
              </select>
            </div>
            {inviteMsg && <div style={styles.msg}>{inviteMsg}</div>}
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowInvite(false)}>Annulla</button>
              <button style={styles.btnPrimary} onClick={createUser}>Crea utente</button>
            </div>
          </div>
        </>
      )}

      {/* Modal modifica */}
      {showEdit && (
        <>
          <div style={styles.overlay} onClick={() => setShowEdit(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Modifica utente</h3>
            <div style={styles.grid2}>
              {[['Nome','nome'],['Cognome','cognome']].map(([l,k]) => (
                <div key={k} style={styles.field}>
                  <label style={styles.label}>{l}</label>
                  <input style={styles.input} value={editForm[k]||''} onChange={e => setEditForm(f => ({...f, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={styles.field}><label style={styles.label}>Ruolo</label>
              <select style={styles.input} value={editForm.ruolo} onChange={e => setEditForm(f => ({...f, ruolo: e.target.value}))}>
                {RUOLI.map(r => <option key={r} value={r}>{RUOLO_LABEL[r]}</option>)}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowEdit(false)}>Annulla</button>
              <button style={styles.btnPrimary} onClick={updateUser}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  wrap: { maxWidth: 900, margin: '0 auto' },
  topbar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' },
  title: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', flex: 1, margin: 0 },
  info: { background: '#f0f7ff', border: '0.5px solid #bdd6ee', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a3a5c', marginBottom: '1rem' },
  tableWrap: { background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '9px 12px', textAlign: 'left', color: '#888', fontWeight: 400, borderBottom: '0.5px solid #f0ede8', background: '#fafaf8', fontSize: 12 },
  tr: {},
  td: { padding: '10px 12px', borderBottom: '0.5px solid #f5f3ee', color: '#1a1a1a', verticalAlign: 'middle' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#1a3a5c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 },
  badge: { display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20 },
  youBadge: { marginLeft: 6, background: '#f0ede8', color: '#888', fontSize: 10, padding: '1px 6px', borderRadius: 10 },
  btnSmall: { background: '#fff', border: '0.5px solid #d8d5ce', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#333' },
  empty: { padding: '2rem', textAlign: 'center', color: '#aaa' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 20 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 14, padding: '1.5rem', zIndex: 40, width: 'min(460px, 96vw)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, color: '#888' },
  input: { padding: '8px 10px', border: '0.5px solid #d8d5ce', borderRadius: 8, fontSize: 13, background: '#fafaf8', color: '#1a1a1a', outline: 'none', width: '100%' },
  msg: { background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#166534' },
  btnPrimary: { background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { background: '#fff', color: '#333', border: '0.5px solid #d8d5ce', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
}
