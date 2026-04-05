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
  { id: 'iht_h', name: "In-Hand Trail Hříbata", price: 300 },
  { id: 'wt_o', name: "Western Trail Open", price: 400 },
  { id: 'rr_o', name: "Ranch Riding Open", price: 400 },
  { id: 'rt_o', name: "Ranch Trail Open", price: 400 },
  { id: 're_o', name: "Reining Open", price: 450 },
  { id: 'wh_o', name: "Western Horsemanship Open", price: 350 },
  { id: 'wp_o', name: "Western Pleasure Open", price: 350 }
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Stavy profilu a registrace
  const [myHorses, setMyHorses] = useState([]);
  const [selectedHorse, setSelectedHorse] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prof, error: profError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!profError) setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', user.id);
        setMyHorses(horses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      setLoading(false);
    } else window.location.reload();
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city,
      full_name: profile.full_name
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else {
      alert('Profil uložen!');
      setEditMode(false);
    }
  };

  const toggleDiscipline = (disc) => {
    const isSelected = selectedDisciplines.find(d => d.id === disc.id);
    if (isSelected) {
      setSelectedDisciplines(selectedDisciplines.filter(d => d.id !== disc.id));
    } else {
      setSelectedDisciplines([...selectedDisciplines, disc]);
    }
  };

  const totalPrice = selectedDisciplines.reduce((sum, d) => sum + d.price, 0);

  if (loading) return (
    <div style={styles.loader}>
      <p>Načítám Pod Humprechtem...</p>
      <button onClick={handleSignOut} style={{marginTop: '20px'}}>Zrušit načítání / Odhlásit</button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Pod Humprechtem" style={styles.logo} onError={(e) => e.target.style.display='none'}/>
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>SYSTÉM PRO JEZDCE A ADMINY</p>
      </div>

      {!user ? (
        <div style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037'}}>Přihlášení</h2>
          <form onSubmit={handleSignIn} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>VSTOUPIT</button>
          </form>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* PROFIL UŽIVATELE */}
          <div style={styles.sideCard}>
            <h3 style={{borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Celé jméno" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Stáj / Ranč" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Město" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                <button type="submit" style={styles.btnSave}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={styles.btnCancel}>Zrušit</button>
              </form>
            ) : (
              <div style={{fontSize: '0.9rem', lineHeight: '1.6'}}>
                <p><strong>Jméno:</strong> {profile?.full_name || 'Nevyplněno'}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Tel:</strong> {profile?.phone || '-'}</p>
                <p><strong>Stáj:</strong> {profile?.stable || '-'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit Profil / Dotazník</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          {/* REGISTRACE DO DISCIPLÍN */}
          <div style={styles.card}>
            <h3 style={{margin: '0 0 15px 0'}}>Nová přihláška k závodu</h3>
            
            <label style={styles.label}>Kůň:</label>
            <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
              <option value="">-- Vyberte koně z historie --</option>
              {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
              <option value="new">+ Nový kůň</option>
            </select>

            <label style={styles.label}>Vyberte disciplíny (více startů):</label>
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
              Celkem za startovné: {totalPrice} Kč
            </div>

            <button style={styles.btnSecondary} onClick={() => alert('Přihláška odeslána! Admin ji nyní vidí.')}>
              ODESLAT PŘIHLÁŠKU (Číslo bude přiděleno)
            </button>
          </div>
        </div>
      )}

      {/* ROLE INDICATORS */}
      {profile?.role === 'admin' && <div style={{...styles.bar, background: '#2e7d32'}}>ADMIN REŽIM</div>}
      {profile?.role === 'judge' && <div style={{...styles.bar, background: '#0277bd'}}>ROZHODČÍ REŽIM</div>}
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  brandHeader: { textAlign: 'center', marginBottom: '30px' },
  logo: { width: '150px', borderRadius: '50%', border: '4px solid #5d4037', marginBottom: '10px' },
  title: { color: '#5d4037', margin: 0 },
  subtitle: { color: '#8d6e63', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '2px' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '20px', maxWidth: '1100px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 20px rgba(0,0,0,0.08)' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', borderTop: '5px solid #5d4037', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
  input: { width: '100%', padding: '12px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '8px', margin: '5px 0', borderRadius: '4px', border: '1px solid #eee' },
  label: { fontSize: '0.85rem', fontWeight: 'bold', color: '#5d4037', display: 'block', marginTop: '15px' },
  btnPrimary: { width: '100%', padding: '12px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '8px', background: '#e57373', color: 'white', border: 'none', borderRadius: '5px', marginTop: '20px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '8px', background: 'transparent', border: '1px solid #5d4037', color: '#5d4037', borderRadius: '5px', cursor: 'pointer', marginTop: '15px' },
  btnSave: { width: '100%', padding: '8px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '5px', marginTop: '10px', cursor: 'pointer' },
  btnCancel: { width: '100%', padding: '8px', background: '#ccc', color: 'black', border: 'none', borderRadius: '5px', marginTop: '5px', cursor: 'pointer' },
  disciplineList: { maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px', marginTop: '10px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer' },
  priceTag: { marginTop: '20px', fontSize: '1.3rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037', borderTop: '2px solid #f4ece4', paddingTop: '10px' },
  bar: { position: 'fixed', bottom: 0, left: 0, right: 0, color: 'white', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem' },
  loader: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
