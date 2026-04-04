import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Spojení s databází pomocí klíčů, které jsi právě uložil do Vercelu
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
    // Pokus o registraci nového jezdce
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage('Chyba: ' + error.message)
    else setMessage('Úspěch! Zkontroluj si svůj e-mail a klikni na potvrzovací odkaz.')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '400px' }}>
      <h1>Jezdecké závody</h1>
      <hr />
      <h2>Registrace nového jezdce</h2>
      <form onSubmit={handleSignUp}>
        <div style={{ marginBottom: '15px' }}>
          <label>E-mail:</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={{ display: 'block', width: '100%', padding: '8px' }} 
            required 
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Heslo (min. 6 znaků):</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ display: 'block', width: '100%', padding: '8px' }} 
            required 
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}>
          Zaregistrovat se
        </button>
      </form>
      {message && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#eef', borderRadius: '5px' }}>
          {message}
        </div>
      )}
    </div>
  )
}
