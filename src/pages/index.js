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
  
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
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
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', user.id);
        setMyHorses(horses || []);

        if (prof?.role === 'admin' || prof?.role === 'judge') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      stable: profile.stable, // Používáme pro číslo hospodářství
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { alert('Profil a údaje pro veterinu uloženy!'); setEditMode(false); }
  };

  const handleRaceRegistration = async () => {
    if (!selectedHorse || selectedDisciplines.length === 0) {
      alert("Vyberte koně a aspoň jednu disciplínu.");
      return;
    }

    // Zjistíme obsazená čísla 1-50
    const { data: taken } = await supabase.from('race_participants').select('start_number');
    const takenNumbers = taken?.map(t => t.start_number) || [];
    const available = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => !takenNumbers.includes(n));

    if (available.length === 0) {
      alert("Kapacita 50 jezdců je vyčerpána!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    const registrationData = selectedDisciplines.map(d => ({
      user_id: user.id,
      rider_name: profile?.full_name || user.email,
      horse_name: selectedHorse,
      discipline: d.name,
      start_number: assignedNumber,
      price: d.price,
      paid: false
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      alert(`Registrace úspěšná! Vaše startovní číslo pro všechny disciplíny je: ${assignedNumber}`);
      window.location.reload();
    }
  };

  if (loading) return <div style={styles.loader}>Načítám...</div>

  return (
    <div style={styles.container}>
      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div style={styles.card}>
          <form onSubmit={(e) => { e.preventDefault(); supabase.auth.signInWithPassword({ email, password }).then(() => window.location.reload()); }} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" style={styles.btnPrimary}>VSTOUPIT</button>
          </form>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* PROFIL / VETERINA */}
          <div style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Číslo hospodářství (veterina)" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                <button type="submit" style={styles.btnSave}>Uložit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Jezdec'}</strong></p>
                <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit profil</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          {/* REGISTRACE / ADMIN TABULKA */}
          <div style={styles.card}>
            {(profile?.role === 'admin' || profile?.role === 'judge') ? (
              <div>
                <h3>Přehled jezdců (Admin/Rozhodčí)</h3>
                <table style={{width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{background: '#eee'}}>
                      <th>Č.</th><th>Jezdec</th><th>Kůň</th><th>Disciplína</th><th>Platba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRegistrations.map((r, i) => (
                      <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                        <td>{r.start_number}</td><td>{r.rider_name}</td><td>{r.horse_name}</td><td>{r.discipline}</td><td>{r.price} Kč</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <h3>Nová přihláška</h3>
                <select style={styles.input} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Přidat koně v nastavení</option>
                </select>
                <div style={styles.disciplineList}>
                  {DISCIPLINES.map(d => (
                    <div key={d.id} onClick={() => {
                      const exists = selectedDisciplines.find(x => x.id === d.id);
                      setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                    }} style={{...styles.disciplineItem, background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                      {d.name} <span>{d.price} Kč</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleRaceRegistration} style={styles.btnSecondary}>REGISTROVAT A PŘIDĚLIT ČÍSLO</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  brandHeader: { textAlign: 'center', marginBottom: '20px' },
  logo: { width: '100px', borderRadius: '50%', border: '3px solid #5d4037' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 3fr', gap: '20px', maxWidth: '1200px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  sideCard: { backgroundColor: '#fff', padding: '15px', borderRadius: '12px', borderTop: '4px solid #5d4037' },
  input: { width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' },
  inputSmall: { width: '100%', padding: '8px', margin: '4px 0', borderRadius: '4px', border: '1px solid #eee' },
  btnPrimary: { width: '100%', padding: '12px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '15px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '8px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', marginTop: '15px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '8px', background: 'transparent', border: '1px solid #5d4037', color: '#5d4037', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
  btnSave: { width: '100%', padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px', cursor: 'pointer' },
  disciplineList: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px', marginTop: '10px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.9rem' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
