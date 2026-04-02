// src/pages/Impostazioni.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CAMPI = [
  { chiave: 'azienda_nome', label: 'Nome azienda', placeholder: 'Es. Agorà Società Cooperativa', tipo: 'text' },
  { chiave: 'azienda_indirizzo', label: 'Indirizzo sede', placeholder: 'Es. Via Cimabue n. 21', tipo: 'text' },
  { chiave: 'azienda_citta', label: 'Città e CAP', placeholder: 'Es. 60019 Senigallia (AN)', tipo: 'text' },
  { chiave: 'azienda_telefono', label: 'Telefono', placeholder: 'Es. 071 123456', tipo: 'text' },
  { chiave: 'azienda_email', label: 'Email', placeholder: 'Es. info@agora.it', tipo: 'email' },
  { chiave: 'azienda_pec', label: 'PEC', placeholder: 'Es. agora@pec.it', tipo: 'email' },
  { chiave: 'azienda_piva', label: 'Partita IVA', placeholder: 'Es. 01234567890', tipo: 'text' },
  { chiave: 'azienda_cf', label: 'Codice Fiscale', placeholder: 'Es. 01234567890', tipo: 'text' },
  { chiave: 'azienda_iban', label: 'IBAN', placeholder: 'Es. IT60 X054 2811 1010 0000 0123 456', tipo: 'text' },
  { chiave: 'azienda_sdi', label: 'Codice SDI', placeholder: 'Es. XXXXXXX', tipo: 'text' },
  { chiave: 'azienda_logo_url', label: 'URL Logo', placeholder: 'https://...', tipo: 'url' },
]

export default function Impostazioni() {
  const { can } = useAuth()
  const [valori, setValori] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadImpostazioni() }, [])

  async function loadImpostazioni() {
    const { data } = await supabase.from('impostazioni').select('chiave,valore')
    const map = {}
    ;(data||[]).forEach(r => map[r.chiave] = r.valore||'')
    setValori(map)
    setLoading(false)
  }

  async function saveImpostazioni() {
    setSaving(true)
    const updates = Object.entries(valori).map(([chiave, valore]) => ({
      chiave, valore, updated_at: new Date().toISOString()
    }))
    await supabase.from('impostazioni').upsert(updates, { onConflict: 'chiave' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={s.loading}>Caricamento...</div>

  return (
    <div style={s.wrap}>
      <div style={s.topbar}>
        <h2 style={s.title}>Impostazioni</h2>
      </div>

      <div style={s.card}>
        <div style={s.sectionTitle}>Dati aziendali</div>
        <div style={s.sectionDesc}>
          Questi dati appaiono sulle ricevute di invio, i documenti generati e le comunicazioni ufficiali.
          {!can.manageUsers && <span style={{color:'#b91c1c'}}> Solo gli amministratori possono modificarli.</span>}
        </div>

        {/* Anteprima intestazione */}
        {valori.azienda_nome && (
          <div style={s.preview}>
            <div style={s.previewTitle}>Anteprima intestazione documenti</div>
            <div style={s.previewBox}>
              {valori.azienda_logo_url && (
                <img src={valori.azienda_logo_url} alt="Logo" style={{height:40,marginBottom:8,display:'block'}} onError={e=>e.target.style.display='none'}/>
              )}
              <div style={{fontSize:16,fontWeight:700,color:'#1a1a1a'}}>{valori.azienda_nome}</div>
              {valori.azienda_indirizzo && <div style={{fontSize:13,color:'#555',marginTop:2}}>{valori.azienda_indirizzo}{valori.azienda_citta?` — ${valori.azienda_citta}`:''}</div>}
              <div style={{fontSize:12,color:'#888',marginTop:6,display:'flex',gap:16,flexWrap:'wrap'}}>
                {valori.azienda_telefono && <span>Tel: {valori.azienda_telefono}</span>}
                {valori.azienda_email && <span>Email: {valori.azienda_email}</span>}
                {valori.azienda_pec && <span>PEC: {valori.azienda_pec}</span>}
              </div>
              <div style={{fontSize:12,color:'#888',marginTop:4,display:'flex',gap:16,flexWrap:'wrap'}}>
                {valori.azienda_piva && <span>P.IVA: {valori.azienda_piva}</span>}
                {valori.azienda_cf && <span>C.F.: {valori.azienda_cf}</span>}
                {valori.azienda_sdi && <span>SDI: {valori.azienda_sdi}</span>}
              </div>
              {valori.azienda_iban && <div style={{fontSize:12,color:'#888',marginTop:4}}>IBAN: {valori.azienda_iban}</div>}
            </div>
          </div>
        )}

        {/* Campi */}
        <div style={s.grid}>
          {CAMPI.map(campo => (
            <div key={campo.chiave} style={s.field}>
              <label style={s.label}>{campo.label}</label>
              <input
                type={campo.tipo}
                style={s.input}
                value={valori[campo.chiave]||''}
                placeholder={campo.placeholder}
                onChange={e => setValori(v => ({...v, [campo.chiave]: e.target.value}))}
                disabled={!can.manageUsers}
              />
            </div>
          ))}
        </div>

        {can.manageUsers && (
          <div style={{display:'flex',alignItems:'center',gap:12,marginTop:'1rem'}}>
            <button style={s.btnPrimary} onClick={saveImpostazioni} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva impostazioni'}
            </button>
            {saved && <span style={{fontSize:13,color:'#27500A'}}>✓ Salvato!</span>}
          </div>
        )}
      </div>

      {/* Info versione */}
      <div style={s.versionBox}>
        <div style={s.versionTitle}>Informazioni sistema</div>
        <div style={s.versionRow}><span>Versione</span><span>1.0.0</span></div>
        <div style={s.versionRow}><span>Database</span><span>Supabase</span></div>
        <div style={s.versionRow}><span>Hosting</span><span>Netlify</span></div>
      </div>
    </div>
  )
}

const s = {
  wrap: { maxWidth: 800, margin: '0 auto' },
  loading: { padding: '2rem', color: '#888', fontSize: 14 },
  topbar: { display: 'flex', alignItems: 'center', marginBottom: '1.25rem' },
  title: { fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 },
  card: { background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#888', marginBottom: '1.25rem' },
  preview: { marginBottom: '1.5rem' },
  previewTitle: { fontSize: 12, color: '#888', marginBottom: 8 },
  previewBox: { background: '#f5f4f0', border: '0.5px solid #e8e5e0', borderRadius: 8, padding: '14px 16px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, color: '#888', fontWeight: 500 },
  input: { padding: '8px 10px', border: '0.5px solid #d8d5ce', borderRadius: 8, fontSize: 13, background: '#fafaf8', color: '#1a1a1a', outline: 'none', width: '100%' },
  btnPrimary: { background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  versionBox: { background: '#fff', border: '0.5px solid #e8e5e0', borderRadius: 12, padding: '1rem 1.5rem' },
  versionTitle: { fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 10 },
  versionRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888', padding: '4px 0', borderBottom: '0.5px solid #f5f3ee' },
}
