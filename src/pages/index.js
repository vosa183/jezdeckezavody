import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(data?.role)
      fetchParticipants()
    }
    setLoading(false)
  }

  async function fetchParticipants() {
    const { data } = await supabase.from('race_participants').select('*')
    if (data) setParticipants(data)
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) window.location.reload()
  }

  if (loading) return <div style={{background: '#1a365d', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Načítám...</div>

  if (role === 'admin') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f7fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#1a365d' }}>Admin Panel - Startovní listina (1-50)</h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#2b6cb0', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Číslo</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Jezdec / Kůň</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Akce</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 50 }, (_, i) => i + 1).map(num => {
              const p = participants.find(x => x.start_number === num)
              return (
                <tr key={num}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{num}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {p ? `${p.rider_name} - ${p.horse_name}` : <em style={{color: '#ccc'}}>Volno</em>}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button style={{ backgroundColor: '#48bb78', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                      Zapsat jezdce
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#1a365d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '1rem', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', color: '#1a365d' }}>Přihlášení pořadatele</h1>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ccc', borderRadius: '0.5rem' }} />
          <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.8rem', border: '1px solid #ccc', borderRadius: '0.5rem' }} />
          <button type="submit" style={{ backgroundColor: '#2b6cb0', color: 'white', padding: '1rem', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Vstoupit do panelu</button>
        </form>
      </div>
    </div>
  )
}
