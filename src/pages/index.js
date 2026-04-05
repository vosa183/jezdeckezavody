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
  // Stavy pro přihlášení/registraci
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Přepínač mezi Přihlásit a Registrovat
  const [loading, setLoading] = useState(true);
  
  // Stavy pro přihlášku do závodu
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); // Ztracené políčko pro nového koně
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      // Registrace nového uživatele
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Registrace úspěšná! Zkontrolujte email nebo se rovnou přihlaste.');
    } else {
      // Přihlášení existujícího
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.reload();
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { alert('Profil uložen!'); setEditMode(false); }
  };

  const handleRaceRegistration = async () => {
    if (!selectedHorse || selectedDisciplines.length === 0) {
      alert("Vyberte koně a aspoň jednu disciplínu.");
      return;
    }

    let finalHorseName = selectedHorse;

    // Pokud uživatel vybral "Nový kůň", uložíme ho nejdřív do databáze koní
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napište jméno nového koně!");
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName }])
        .select().single();
      
      if (horseErr) {
        alert("Chyba při ukládání koně: " + horseErr.message);
        return;
      }
      finalHorseName = newHorse.name;
    }

    // Vyhledání volného startovního čísla 1-50
    const { data: taken } = await supabase.from('race_participants').select('start_number');
    const takenNumbers = taken?.map(t => t.start_number) || [];
    const available = Array.from({ length: 50 }, (_, i) => i + 1).filter(n => !takenNumbers.includes(n));

    if (available.length === 0) {
      alert("Kapacita 50 jezdců je vyčerpána!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    // Zápis do závodu
    const registrationData = selectedDisciplines.map(d => ({
      user_id: user.id,
      rider_name: profile?.full_name || user.email,
      horse_name: finalHorseName,
      discipline: d.name,
      start_number: assignedNumber,
      price: d.price,
      paid: false
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      alert(`Přihláška odeslána! Vaše startovní číslo pro vybrané disciplíny je: ${assignedNumber}`);
      window.location.reload();
    }
  };

  if (loading) return <div style={styles.loader}>Načítám...</div>

  return (
    <div style={styles.container}>
      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>
            {isSignUp ? 'Nová registrace' : 'Přihlášení'}
          </h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo (min. 6 znaků)" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            
            <button type="submit" style={styles.btnPrimary}>
              {isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}
            </button>
          </form>
          
          <div style={{textAlign: 'center', marginTop: '15px'}}>
            <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
              {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* PROFIL / VETERINA */}
          <div style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Číslo hospodářství (např. CZ12345678)" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                <button type="submit" style={styles.btnSave}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          {/* REGISTRACE / ADMIN TABULKA */}
          <div style={styles.card}>
            {(profile?.role === 'admin' || profile?.role === 'judge') ? (
              <div>
                <h3>Přehled jezdců (Admin/Rozhodčí)</h3>
                <div style={{overflowX: 'auto'}}>
                  <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#eee', textAlign: 'left'}}>
                        <th style={{padding: '8px'}}>Č.</th>
                        <th style={{padding: '8px'}}>Jezdec</th>
                        <th style={{padding: '8px'}}>Kůň</th>
                        <th style={{padding: '8px'}}>Disciplína</th>
                        <th style={{padding: '8px'}}>Platba</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRegistrations.map((r, i) => (
                        <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                          <td style={{padding: '8px'}}>{r.rider_name}</td>
                          <td style={{padding: '8px'}}>{r.horse_name}</td>
                          <td style={{padding: '8px'}}>{r.discipline}</td>
                          <td style={{padding: '8px'}}>{r.price} Kč</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{marginTop: 0}}>Nová přihláška</h3>
                
                <label style={styles.label}>Vyberte koně:</label>
                <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně z historie --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Přidat nového koně</option>
                </select>
                
                {/* Ztracené políčko je zpět! */}
                {selectedHorse === 'new' && (
                  <input 
                    type="text" 
                    placeholder="Napište jméno koně..." 
                    value={newHorseName} 
                    onChange={e => setNewHorseName(e.target.value)} 
                    style={{...styles.input, border: '2px solid #8d6e63'}} 
                  />
                )}

                <label style={styles.label}>Disciplíny (možno vybrat více):</label>
                <div style={styles.disciplineList}>
                  {DISCIPLINES.map(d => (
                    <div key={d.id} onClick={() => {
                      const exists = selectedDisciplines.find(x => x.id === d.id);
                      setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                    }} style={{...styles.disciplineItem, background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                      {d.name} <strong>{d.price} Kč</strong>
                    </div>
                  ))}
                </div>
                
                <div style={styles.priceTag}>
                  Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč
                </div>

                <button onClick={handleRaceRegistration} style={styles.btnSecondary}>
                  ODESLAT PŘIHLÁŠKU A PŘIDĚLIT ČÍSLO
                </button>
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
  logo: { width: '120px', borderRadius: '50%', border: '4px solid #5d4037' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', gap: '20px', maxWidth: '1100px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', margin: '0 auto', maxWidth: user ? 'none' : '400px', width: '100%' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  label: { fontSize: '0.9rem', fontWeight: 'bold', color: '#5d4037', display: 'block', marginTop: '15px' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '10px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #5d4037', color: '#5d4037', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
  btnSave: { width: '100%', padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', marginTop: '10px', cursor: 'pointer' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' },
  disciplineList: { maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
