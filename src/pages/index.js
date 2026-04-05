import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const DISCIPLINES = [
  { id: 'sah_o', name: "Showmanship at Halter Open", price: 300 },
  { id: 'sah_h', name: "Showmanship at Halter Hříbata", price: 250 },
  { id: 'sah_m', name: "Showmanship at Halter Mládež", price: 250 },
  { id: 'sah_d', name: "Showmanship at Halter Děti", price: 200 },
  { id: 'iht_o', name: "In-Hand Trail Open", price: 350 },
  { id: 'iht_r', name: "In-Hand Trail Rookies", price: 300 },
  { id: 'wt_o', name: "Western Trail Open", price: 400 },
  { id: 'rr_o', name: "Ranch Riding Open", price: 400 },
  // ... sem doplníš zbytek podle potřeby
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Registrační stav
  const [myHorses, setMyHorses] = useState([]);
  const [selectedHorse, setSelectedHorse] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
      fetchHorses(user.id);
    }
    setLoading(false);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.reload();
  };

  const toggleDiscipline = (disc) => {
    const isSelected = selectedDisciplines.find(d => d.id === disc.id);
    let updated;
    if (isSelected) {
      updated = selectedDisciplines.filter(d => d.id !== disc.id);
    } else {
      updated = [...selectedDisciplines, disc];
    }
    setSelectedDisciplines(updated);
    setTotalPrice(updated.reduce((sum, d) => sum + d.price, 0));
  };

  if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  return (
    <div style={styles.container}>
      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>SYSTÉM PRO JEZDCE A ROZHODČÍ</p>
      </div>

      {!user ? (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Přihlášení</h2>
          <form onSubmit={handleSignIn} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" style={styles.btnPrimary}>VSTOUPIT</button>
          </form>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* LEVÝ PANEL - PROFIL */}
          <div style={styles.sideCard}>
            <h3>Můj Profil</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {profile?.role || 'Jezdec'}</p>
            <button onClick={() => alert('Zde bude editace údajů')} style={styles.btnOutline}>Upravit údaje</button>
            <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
          </div>

          {/* STŘEDNÍ PANEL - REGISTRACE */}
          <div style={styles.card}>
            <h3>Nová přihláška</h3>
            <label>Vyberte koně:</label>
            <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
              <option value="">-- Vyberte koně --</option>
              {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              <option value="new">+ Nový kůň</option>
            </select>

            <label style={{marginTop: '20px', display: 'block'}}>Disciplíny (vyberte i více):</label>
            <div style={styles.disciplineList}>
              {DISCIPLINES.map(d => (
                <div key={d.id} 
                     onClick={() => toggleDiscipline(d)}
                     style={{
                       ...styles.disciplineItem,
                       backgroundColor: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'
                     }}>
                  <span>{d.name}</span>
                  <strong>{d.price} Kč</strong>
                </div>
              ))}
            </div>

            <div style={styles.priceTag}>
              Celkem k platbě: {totalPrice} Kč
            </div>

            <button style={styles.btnSecondary} onClick={() => alert('Odesílám přihlášku a přiděluji náhodné číslo...')}>
              ODESLAT PŘIHLÁŠKU
            </button>
          </div>
        </div>
      )}

      {/* ADMIN / ROZHODČÍ LIŠTA */}
      {profile?.role === 'admin' && (
        <div style={styles.adminBar}>
          <span>ADMIN MOD: Máte přístup k platbám a správě jezdců.</span>
        </div>
      )}
      {profile?.role === 'judge' && (
        <div style={styles.judgeBar}>
          <span>ROZHODČÍ MOD: Máte přístup k bodování manévrů.</span>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  brandHeader: { textAlign: 'center', marginBottom: '30px' },
  logo: { width: '120px', borderRadius: '50%', border: '3px solid #5d4037' },
  title: { color: '#5d4037', marginBottom: '5px' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '3px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', maxWidth: '1000px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #5d4037' },
  input: { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ddd' },
  btnPrimary: { width: '100%', padding: '12px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '8px', background: '#e57373', color: 'white', border: 'none', borderRadius: '5px', marginTop: '10px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '8px', background: 'transparent', border: '1px solid #5d4037', borderRadius: '5px', cursor: 'pointer' },
  disciplineList: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px', marginTop: '10px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.9rem' },
  priceTag: { marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  adminBar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#2e7d32', color: 'white', padding: '10px', textAlign: 'center' },
  judgeBar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0277bd', color: 'white', padding: '10px', textAlign: 'center' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};
