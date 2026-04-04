import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Inicializace Supabase klienta s proměnnými prostředí
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',
      }
    })
    if (error) setMessage('Chyba: ' + error.message)
    else setMessage('Úspěch! Zkontroluj svůj e-mail a klikni na potvrzovací odkaz.')
    setLoading(false)
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage('Chyba: ' + error.message)
    else setMessage('Přihlášen! Vítej na závodech.')
    setLoading(false)
  }

  return (
    <div style={{ 
      backgroundColor: '#1a365d', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      margin: 0,
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2.5rem', 
        borderRadius: '1rem', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
        maxWidth: '400px', 
        width: '100%' 
      }}>
        <h1 style={{ textAlign: 'center', color: '#1a365d', marginBottom: '1.5rem' }}>Jezdecké závody</h1>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#4a5568' }}>E-mail:</label>
            <input 
              type="email" 
              placeholder="vosa183@seznam.cz" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', border: '1px solid #cbd5e0', borderRadius: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#4a5568' }}>Heslo (min. 6 znaků):</label>
            <input 
              type="password" 
              placeholder="******" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.7rem', border: '1px solid #cbd5e0', borderRadius: '0.5rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '0.5rem' }}>
            <button 
              onClick={handleSignIn} 
              disabled={loading}
              style={{ 
                flex: 1, 
                backgroundColor: '#2b6cb0', 
                color: 'white', 
                padding: '0.8rem', 
                border: 'none', 
                borderRadius: '0.5rem', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Přihlásit se
            </button>
            <button 
              onClick={handleSignUp} 
              disabled={loading}
              style={{ 
                flex: 1, 
                backgroundColor: '#48bb78', 
                color: 'white', 
                padding: '0.8rem', 
                border: 'none', 
                borderRadius: '0.5rem', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Registrovat
            </button>
          </div>
        </form>

        {message && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            backgroundColor: message.includes('Chyba') ? '#fff5f5' : '#f0fff4',
            color: message.includes('Chyba') ? '#c53030' : '#2f855a',
            fontSize: '0.9rem',
            textAlign: 'center',
            border: `1px solid ${message.includes('Chyba') ? '#feb2b2' : '#9ae6b4'}`
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
