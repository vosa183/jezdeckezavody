import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const DISCIPLINES = [
  "Showmanship at Halter Open", "Showmanship at Halter Hříbata", "Showmanship at Halter Mládež", "Showmanship at Halter Děti",
  "In-Hand Trail Open", "In-Hand Trail Hříbata", "In-Hand Trail Rookies", "In-Hand Trail Advanced", "In-Hand Trail Děti",
  "Western Trail Open", "Western Trail Rookies", "Western Trail Advanced", "Western Trail Děti",
  "Ranch Trail Open", "Ranch Trail Mládež", "Ranch Riding Open", "Ranch Riding Mládež",
  "Ranch Reining Open", "Ranch Reining Mládež", "Western Horsemanship Open", "Western Horsemanship Rookies",
  "Western Horsemanship Advanced", "Western Horsemanship Děti", "Western Pleasure Open", "Western Pleasure Mládež"
]

export default function Home() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  
  // Data pro registraci
  const [myHorses, setMyHorses] = useState([])
  const [selectedHorse, setSelectedHorse] = useState('')
  const [newHorseName, setNewHorseName] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(profile?.role)
      fetchHorses(user.id)
    }
    setLoading(false)
  }

  async function fetchHorses(userId) {
    const { data } = await supabase.from('horses').select('*').eq('owner_id', userId)
    setMyHorses(data || [])
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage('Chyba: ' + error.message)
    else window.location.reload()
  }

  const handleRegisterToRace = async () => {
    if (!selectedDiscipline || (!selectedHorse && !newHorseName)) {
      alert('Vyber koně a disciplínu!')
      return
    }

    // 1. Zjistíme obsazená čísla
    const { data: taken } = await supabase.from('race_participants').select('start_number')
    const takenNumbers = taken?.map(t => t.start_number) || []
    
    // 2. Najdeme volná čísla v rozsahu 1-50
    const available = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => !takenNumbers.includes(n))
    
    if (available.length === 0) {
      alert('Kapacita závodu (50 míst) je naplněna!')
      return
    }

    // 3. Vybereme náhodné volné číslo
    const randomNumber = available[Math.floor(Math.random() * available.length)]

    // 4. Uložíme koně, pokud je nový
    let horseName = selectedHorse
    if (selectedHorse === 'new') {
      const { data: newHorse } = await supabase.from('horses').insert([{ owner_id: user.id, name: newHorseName }]).select().single()
      horseName = newHorse.name
    }

    // 5. Zápis do závodu
    const { error } = await supabase.from('race_participants').insert([{
      user_id: user.id,
      rider_name: user.email,
      horse_name: horseName,
      discipline: selectedDiscipline,
      start_number: randomNumber
    }])

    if (!error) {
      alert(`Úspěšně zapsáno! Vaše startovní číslo je: ${randomNumber}`)
      window.location.reload()
    }
  }

  if (loading) return <div style={styles.loader}>Načítám...</div>

  return (
    <div style={styles.container}>
      {/* BRANDING */}
      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Pod Humprechtem" style={styles.logo} onError={(e) => e.target.style.display='none'}/>
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <h2 style={styles.subtitle}>POD HUMPRECHTEM</h2>
      </div>

      {!user ? (
        /* PŘIHLÁŠENÍ */
        <div style={styles.card}>
          <form onSubmit={handleSignIn} style={styles.form}>
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" style={styles.btnPrimary}>Vstoupit</button>
            {message && <p style={styles.msg}>{message}</p>}
          </form>
        </div>
      ) : (
        /* REGISTRACE DO ZÁVODU */
        <div style={styles.card}>
          <h3 style={{color: '#5d4037'}}>Přihláška k závodu</h3>
          
          <div style={styles.field}>
            <label>Kůň z historie nebo nový:</label>
            <select value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)} style={styles.input}>
              <option value="">-- Vyberte koně --</option>
              {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              <option value="new">+ Nový kůň (zapsat jméno)</option>
            </select>
            {selectedHorse === 'new' && (
              <input type="text" placeholder="Jméno nového koně" value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, marginTop: '10px'}} />
            )}
          </div>

          <div style={styles.field}>
            <label>Disciplína:</label>
            <select value={selectedDiscipline} onChange={e => setSelectedDiscipline(e.target.value)} style={styles.input}>
              <option value="">-- Vyberte disciplínu --</option>
              {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <button onClick={handleRegisterToRace} style={styles.btnSecondary}>
            PŘIHLÁSIT SE A PŘIDĚLIT ČÍSLO
          </button>
          
          {role === 'admin' && (
            <button onClick={() => alert('Zde brzy bude bodovací editor')} style={styles.btnAdmin}>
              VSTOUPIT DO BODOVÁNÍ (ADMIN)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#f4ece4', // Písková barva
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: '"Times New Roman", Times, serif',
    padding: '20px'
  },
  brandHeader: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logo: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '4px solid #5d4037',
    marginBottom: '15px',
    objectFit: 'cover'
  },
  title: { color: '#5d4037', margin: 0, fontSize: '1.5rem', letterSpacing: '2px' },
  subtitle: { color: '#8d6e63', margin: 0, fontSize: '2rem', fontWeight: 'bold' },
  card: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '450px',
    borderTop: '8px solid #5d4037'
  },
  input: {
    width: '100%',
    padding: '12px',
    margin: '10px 0',
    borderRadius: '5px',
    border: '1px solid #d7ccc8',
    boxSizing: 'border-box'
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#5d4037',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: '#8d6e63',
    color: 'white',
    padding: '15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '20px'
  },
  btnAdmin: {
    width: '100%',
    backgroundColor: '#2e7d32',
    color: 'white',
    padding: '10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  field: { marginBottom: '20px' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
}
