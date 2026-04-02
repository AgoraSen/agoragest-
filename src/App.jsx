// src/App.jsx
import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Candidati from './pages/Candidati'
import Utenti from './pages/Utenti'
import Agenda from './pages/Agenda'
import Comunicazioni from './pages/Comunicazioni'

// Placeholder pages (da sviluppare — usano i widget già costruiti come base)
function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14 }}>Modulo in fase di integrazione con il database.</div>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0' }}>
      <div style={{ color: '#888', fontSize: 14 }}>Caricamento...</div>
    </div>
  )

  if (!user) return <Login />

  function renderPage() {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />
      case 'candidati': return <Candidati />
      case 'utenti': return <Utenti />
      case 'agenda': return <Agenda />
      case 'corsi': return <PlaceholderPage title="Corsi" />
      case 'comunicazioni': return <Comunicazioni />
      case 'automazioni': return <PlaceholderPage title="Automazioni" />
      default: return <Dashboard onNavigate={setPage} />
    }
  }

  return (
    <Layout page={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
