// src/pages/Candidati.jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATI = ['In attesa','Colloquio fissato','In formazione','Collocato','Abbandonato / non risponde']
const STATI_COLOR = {
  'In attesa': { bg: '#FAEEDA', color: '#633806' },
  'Colloquio fissato': { bg: '#E6F1FB', color: '#0C447C' },
  'In formazione': { bg: '#EEEDFE', color: '#3C3489' },
  'Collocato': { bg: '#EAF3DE', color: '#27500A' },
  'Abbandonato / non risponde': { bg: '#FCEBEB', color: '#791F1F' },
}

export default function Candidati() {
  const { profile, can } = useAuth()
  const [candidati, setCandidati] = useState([])
  const [filtered, setFiltered] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [selected, setSelected] = useState(null)
  const [colloqui, setColloqui] = useState([])
  const [apptFuturi, setApptFuturi] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [showColloquioModal, setShowColloquioModal] = useState(false)
  const [colloquioForm, setColloquioForm] = useState({ data: '', operatore_nome: '', note: '' })
  const PAGE_SIZE = 30

  useEffect(() => { loadProfiles(); loadCandidati() }, [])

  useEffect(() => {
    const lower = q.toLowerCase()
    const f = candidati.filter(c =>
      (!lower || (c.nome + c.cognome + (c.cf||'') + (c.email||'')).toLowerCase().includes(lower)) &&
      (!filterStato || c.stato === filterStato)
    )
    setFiltered(f)
    setPage(0)
  }, [q, filterStato, candidati])

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('id, nome, cognome').eq('attivo', true)
    setProfiles(data || [])
  }

  async function loadCandidati() {
    setLoading(true)
    let query = supabase
      .from('candidati')
      .select('*, profiles!candidati_referente_id_fkey(nome, cognome)')
      .order('cognome')

    if (!can.viewAll) query = query.eq('referente_id', profile.id)

    const { data } = await query
    setCandidati(data || [])
    setLoading(false)
  }

  async function openPanel(c) {
    setSelected(c)
    const today = new Date().toISOString().slice(0, 10)
    const [{ data: col }, { data: appts }] = await Promise.all([
      supabase.from('colloqui').select('*').eq('candidato_id', c.id).order('data', { ascending: false }),
      supabase.from('appuntamenti').select('*').eq('candidato_id', c.id).eq('stato', 'attivo').gte('data', today).order('data'),
    ])
    setColloqui(col || [])
    setApptFuturi(appts || [])
  }

  function openAdd() {
    setEditId(null)
    setForm({ stato: 'In attesa', referente_id: profile.id })
    setShowModal(true)
  }

  function openEdit(c) {
    setEditId(c.id)
    setForm({ nome: c.nome, cognome: c.cognome, cf: c.cf, email: c.email, tel: c.tel, comune: c.comune, stato: c.stato, percorso: c.percorso, referente_id: c.referente_id, note: c.note })
    setShowModal(true)
  }

  async function saveCandidate() {
    if (!form.nome || !form.cognome) return
    if (editId) {
      await supabase.from('candidati').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId)
    } else {
      await supabase.from('candidati').insert([form])
    }
    setShowModal(false)
    loadCandidati()
    if (selected?.id === editId) openPanel({ ...selected, ...form })
  }

  async function saveColloquio() {
    if (!colloquioForm.data || !selected) return
    await supabase.from('colloqui').insert([{
      candidato_id: selected.id,
      data: colloquioForm.data,
      operatore_id: profile.id,
      operatore_nome: colloquioForm.operatore_nome || `${profile.nome} ${profile.cognome}`,
      note: colloquioForm.note,
    }])
    setShowColloquioModal(false)
    openPanel(selected)
  }

  async function exportCsv() {
    const header = 'Nome,Cognome,CF,Email,Telefono,Comune,Stato,Percorso'
    const rows = filtered.map(c =>
      [c.nome, c.cognome, c.cf, c.email, c.tel, c.comune, c.stato, c.percorso]
        .map(v => `"${(v||'').replace(/"/g,'""')}"`).join(',')
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'candidati.csv'; a.click()
  }

  function fmtDate(s) {
    if (!s) return '—'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.topbar}>
        <h2 style={styles.title}>Candidati <span style={styles.count}>({candidati.length})</span></h2>
        <button style={styles.btnSecondary} onClick={exportCsv}>↓ CSV</button>
        <button style={styles.btnPrimary} onClick={openAdd}>+ Nuovo candidato</button>
      </div>

      {/* Filtri */}
      <div style={styles.filters}>
        <input style={styles.search} placeholder="Cerca nome, CF, email..." value={q} onChange={e => setQ(e.target.value)} />
        <select style={styles.select} value={filterStato} onChange={e => setFilterStato(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Tabella */}
      {loading
        ? <div style={styles.empty}>Caricamento...</div>
        : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['', 'Nome', 'Telefono', 'Stato', 'Percorso', 'Comune', 'Referente'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(c => (
                  <tr key={c.id} style={styles.tr} onClick={() => openPanel(c)}>
                    <td style={styles.td}>
                      <div style={styles.avatar}>{c.nome[0]}{c.cognome[0]}</div>
                    </td>
                    <td style={styles.td}><strong>{c.nome} {c.cognome}</strong></td>
                    <td style={{ ...styles.td, color: '#888' }}>{c.tel || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...STATI_COLOR[c.stato] }}>
                        {c.stato === 'Abbandonato / non risponde' ? 'Abbandonato' : c.stato}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: '#888', fontSize: 12 }}>
                      {c.percorso?.match(/\d+/)?.[0] ? `P${c.percorso.match(/\d+/)[0]}` : '—'}
                    </td>
                    <td style={{ ...styles.td, color: '#888' }}>{c.comune || '—'}</td>
                    <td style={{ ...styles.td, color: '#888', fontSize: 12 }}>
                      {c.profiles ? `${c.profiles.nome} ${c.profiles.cognome}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Paginazione */}
      <div style={styles.pager}>
        <button style={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
        <span style={{ fontSize: 13, color: '#888' }}>
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} di {filtered.length}
        </span>
        <button style={styles.pageBtn} disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(p => p + 1)}>›</button>
      </div>

      {/* Detail Panel */}
      {selected && (
        <>
          <div style={styles.overlay} onClick={() => setSelected(null)} />
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelName}>{selected.nome} {selected.cognome}</div>
                <span style={{ ...styles.badge, ...STATI_COLOR[selected.stato] }}>{selected.stato}</span>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={styles.panelBody}>
              <div style={styles.dl}>Codice fiscale</div><div style={styles.dv}>{selected.cf || '—'}</div>
              <div style={styles.dl}>Email</div><div style={styles.dv}>{selected.email || '—'}</div>
              <div style={styles.dl}>Telefono</div><div style={styles.dv}>{selected.tel || '—'}</div>
              <div style={styles.dl}>Comune</div><div style={styles.dv}>{selected.comune || '—'}</div>
              <div style={styles.dl}>Percorso GOL</div><div style={styles.dv}>{selected.percorso || '—'}</div>
              {selected.note && <><div style={styles.dl}>Note</div><div style={styles.dv}>{selected.note}</div></>}

              <div style={styles.panelActions}>
                <button style={styles.btnSecondary} onClick={() => openEdit(selected)}>Modifica</button>
                <button style={styles.btnPrimary} onClick={() => { setShowColloquioModal(true); setColloquioForm({ data: new Date().toISOString().slice(0,10), operatore_nome: `${profile.nome} ${profile.cognome}`, note: '' }) }}>+ Colloquio</button>
              </div>

              <div style={styles.sectionTitle}>Prossimi appuntamenti ({apptFuturi.length})</div>
              {apptFuturi.length === 0
                ? <div style={styles.emptySmall}>Nessun appuntamento futuro.</div>
                : apptFuturi.map(a => (
                  <div key={a.id} style={styles.apptCard}>
                    <div style={styles.apptDate}>{fmtDate(a.data)} · {a.ora_inizio?.slice(0,5)}–{a.ora_fine?.slice(0,5)}</div>
                    <div style={styles.apptSala}>{a.sala}</div>
                  </div>
                ))
              }

              <div style={styles.sectionTitle}>Storico colloqui ({colloqui.length})</div>
              {colloqui.length === 0
                ? <div style={styles.emptySmall}>Nessun colloquio registrato.</div>
                : colloqui.map(c => (
                  <div key={c.id} style={styles.colloquioCard}>
                    <div style={styles.apptDate}>{fmtDate(c.data)} · {c.operatore_nome}</div>
                    <div style={{ fontSize: 13, color: '#333', marginTop: 3 }}>{c.note}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}

      {/* Modal aggiungi/modifica */}
      {showModal && (
        <>
          <div style={styles.overlay} onClick={() => setShowModal(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editId ? 'Modifica candidato' : 'Nuovo candidato'}</h3>
            <div style={styles.grid2}>
              {[['Nome','nome'],['Cognome','cognome']].map(([label, key]) => (
                <div key={key} style={styles.field}>
                  <label style={styles.label}>{label}</label>
                  <input style={styles.input} value={form[key]||''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} />
                </div>
              ))}
            </div>
            {[['Codice fiscale','cf'],['Email','email'],['Telefono','tel'],['Comune','comune'],['Percorso GOL','percorso']].map(([label, key]) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>{label}</label>
                <input style={styles.input} value={form[key]||''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} />
              </div>
            ))}
            <div style={styles.field}>
              <label style={styles.label}>Stato</label>
              <select style={styles.input} value={form.stato||'In attesa'} onChange={e => setForm(f => ({...f, stato: e.target.value}))}>
                {STATI.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Referente</label>
              <select style={styles.input} value={form.referente_id||''} onChange={e => setForm(f => ({...f, referente_id: e.target.value}))}>
                <option value="">— nessuno —</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Note</label>
              <textarea style={{ ...styles.input, minHeight: 60 }} value={form.note||''} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>Annulla</button>
              <button style={styles.btnPrimary} onClick={saveCandidate}>Salva</button>
            </div>
          </div>
        </>
      )}

      {/* Modal colloquio */}
      {showColloquioModal && (
        <>
          <div style={styles.overlay} onClick={() => setShowColloquioModal(false)} />
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Aggiungi colloquio</h3>
            <div style={styles.field}><label style={styles.label}>Data</label>
              <input type="date" style={styles.input} value={colloquioForm.data} onChange={e => setColloquioForm(f => ({...f, data: e.target.value}))} />
            </div>
            <div style={styles.field}><label style={styles.label}>Operatore</label>
              <input style={styles.input} value={colloquioForm.operatore_nome} onChange={e => setColloquioForm(f => ({...f, operatore_nome: e.target.value}))} />
            </div>
            <div style={styles.field}><label style={styles.label}>Note</label>
              <textarea style={{ ...styles.input, minHeight: 70 }} value={colloquioForm.note} onChange={e => setColloquioForm(f => ({...f, note: e.target.value}))} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowColloquioModal(false)}>Annulla</button>
              <button style={styles.btnPrimary} onClick={saveColloquio}>Salva</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  wrap: { maxWidth: 1080, margin: '0 auto' },
  topbar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', flex: 1, margin: 0 },
  count: { fontWeight: 400, color: '#aaa', fontSize: 16 },
  filters: { display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 200, padding: '8px 12px', border: '0.5px solid #d8d5ce', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1a1a1a', outline: 'none' },
  select: { padding: '8px 12px', border: '0.5px solid #d8d5ce', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1a1a1a', minWidth: 160 },
  tableWrap: { overflowX: 'auto', background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '9px 12px', textAlign: 'left', color: '#888', fontWeight: 400, borderBottom: '0.5px solid #f0ede8', background: '#fafaf8', fontSize: 12 },
  tr: { cursor: 'pointer', transition: 'background .1s' },
  td: { padding: '9px 12px', borderBottom: '0.5px solid #f5f3ee', color: '#1a1a1a', verticalAlign: 'middle' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#e6f1fb', color: '#0c447c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 },
  badge: { display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 20 },
  pager: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'center' },
  pageBtn: { background: '#fff', border: '0.5px solid #d8d5ce', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: '#333' },
  empty: { padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: 14 },
  emptySmall: { fontSize: 13, color: '#aaa', padding: '4px 0 8px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 20 },
  panel: { position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(400px, 98vw)', background: '#fff', borderLeft: '0.5px solid #e8e5e0', overflowY: 'auto', zIndex: 30, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 0 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  panelName: { fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa', padding: 4 },
  panelBody: { fontSize: 14 },
  panelActions: { display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' },
  dl: { fontSize: 12, color: '#aaa', marginTop: 10, marginBottom: 2 },
  dv: { fontSize: 14, color: '#1a1a1a', wordBreak: 'break-word' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: '16px 0 8px', paddingTop: 14, borderTop: '0.5px solid #f0ede8' },
  apptCard: { background: '#f5f4f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6 },
  colloquioCard: { background: '#f5f4f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6 },
  apptDate: { fontSize: 12, color: '#888' },
  apptSala: { fontSize: 13, color: '#1a1a1a', marginTop: 2 },
  modal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 14, padding: '1.5rem', zIndex: 40, width: 'min(480px, 96vw)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, color: '#888' },
  input: { padding: '8px 10px', border: '0.5px solid #d8d5ce', borderRadius: 8, fontSize: 13, background: '#fafaf8', color: '#1a1a1a', outline: 'none', width: '100%' },
  btnPrimary: { background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { background: '#fff', color: '#333', border: '0.5px solid #d8d5ce', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
}
