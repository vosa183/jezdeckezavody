import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Úspěch! Zkontroluj svůj e-mail pro potvrzení.')
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Přihlášen! Vítej na závodech.')
  }

  return (
    <div style={{ 
      backgroundColor: '#1a365d', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: '#1a365d' }}>Jezdecké závody</h1>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Tvůj e-mail" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem' }}
          />
          <input 
            type="password" 
            placeholder="Heslo" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.25rem' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSignIn} style={{ flex: 1, backgroundColor: '#2b6cb0', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Přihlásit se</button>
            <button onClick={handleSignUp} style={{ flex: 1, backgroundColor: '#48bb78', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Registrovat</button>
          </div>
        </form>
        {message && <p style={{ marginTop: '1rem', textAlign: 'center', color: '#e53e3e' }}>{message}</p>}
      </div>
    </div>
  )
}
