/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import React from 'react';

// Napojení na úplně stejnou databázi jako hlavní závodní aplikace
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function StajoveImperium() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Přihlašovací stavy
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Stavy pro koně
  const [myHorses, setMyHorses] = useState([]);
  const [isEditingHorse, setIsEditingHorse] = useState(false);
  const [currentHorseId, setCurrentHorseId] = useState(null);
  
  // Formulář koně (obsahuje i nové plánované kolonky)
  const [horseData, setHorseData] = useState({
    name: '',
    birth_year: '',
    horse_id_number: '',
    vaccination_date: '', // Připraveno pro databázi
    farrier_date: '',     // Připraveno pro databázi
    diet_notes: ''        // Připraveno pro databázi
  });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        
        // Načtení profilu
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        // Načtení koní majitele
        await fetchMyHorses(authUser.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyHorses(userId) {
    const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', userId);
    setMyHorses(horses || []);
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        alert('Registrace úspěšná! Můžete vstoupit do své stáje.');
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.reload();
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSaveHorse = async (e) => {
    e.preventDefault();
    
    // ZATÍM UKLÁDÁME JEN EXISTUJÍCÍ SLOUPCE (name, birth_year, horse_id_number)
    // Jakmile přidáš do Supabase nové sloupce, přidáme je i sem!
    const payload = {
      owner_id: user.id,
      name: horseData.name,
      birth_year: horseData.birth_year,
      horse_id_number: horseData.horse_id_number,
      // vaccination_date: horseData.vaccination_date, 
      // farrier_date: horseData.farrier_date,
      // diet_notes: horseData.diet_notes
    };

    if (currentHorseId) {
      // Aktualizace existujícího
      const { error } = await supabase.from('horses').update(payload).eq('id', currentHorseId);
      if (error) alert(error.message);
      else alert('Karta koně aktualizována!');
    } else {
      // Vytvoření nového
      const { error } = await supabase.from('horses').insert([payload]);
      if (error) alert(error.message);
      else alert('Nový kůň ustájen!');
    }

    resetHorseForm();
    fetchMyHorses(user.id);
  };

  const editHorse = (h) => {
    setHorseData({
      name: h.name || '',
      birth_year: h.birth_year || '',
      horse_id_number: h.horse_id_number || '',
      vaccination_date: h.vaccination_date || '', // Načte se, až to bude v DB
      farrier_date: h.farrier_date || '',         // Načte se, až to bude v DB
      diet_notes: h.diet_notes || ''              // Načte se, až to bude v DB
    });
    setCurrentHorseId(h.id);
    setIsEditingHorse(true);
  };

  const deleteHorse = async (id, name) => {
    if (confirm(`Opravdu chcete koně ${name} trvale smazat ze své stáje?`)) {
      const { error } = await supabase.from('horses').delete().eq('id', id);
      if (error) alert('Chyba při mazání: Možná je kůň přihlášen na závody. ' + error.message);
      else fetchMyHorses(user.id);
    }
  };

  const resetHorseForm = () => {
    setHorseData({ name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '' });
    setCurrentHorseId(null);
    setIsEditingHorse(false);
  };

  if (loading) return <div style={styles.loader}>Otevírám vrata stáje...</div>;

  return (
    <div style={styles.container}>
      {/* Hlavní navigace pro modul Stáje */}
      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>🐴 Moje Stáj</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.location.href = '/'} style={styles.btnNavOutline}>🔙 Zpět na Závody</button>
            <button onClick={handleSignOut} style={styles.btnNavSignOut}>Odhlásit se</button>
          </div>
        </div>
      )}

      {!user ? (
        <div style={{...styles.card, maxWidth: '400px', margin: '40px auto'}}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h1 style={{color: '#5d4037', margin: '0 0 10px 0'}}>Vítejte ve stáji</h1>
            <p style={{color: '#888', margin: 0}}>Pro správu svých koní se prosím přihlaste.</p>
          </div>
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT DO STÁJE'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
          </button>
        </div>
      ) : (
        <div style={styles.mainContent}>
          
          {/* Uvítací panel majitele */}
          <div style={styles.welcomePanel}>
            <h2 style={{ margin: '0 0 5px 0', color: '#5d4037' }}>Vítejte, {profile?.full_name || 'Neznámý jezdci'}!</h2>
            <p style={{ margin: 0, color: '#666' }}>Tady je vaše osobní centrála pro správu koňských parťáků. Plánujte tréninky, hlídejte očkování a mějte vše na jednom místě.</p>
          </div>

          {/* Rozvržení: Seznam koní vs. Formulář */}
          <div style={styles.grid}>
            
            {/* Levá část: Seznam mých koní */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#3e2723', fontSize: '1.5rem' }}>Obyvatelé vaší stáje</h3>
                {!isEditingHorse && (
                  <button onClick={() => setIsEditingHorse(true)} style={styles.btnAdd}>+ Přidat koně</button>
                )}
              </div>

              {myHorses.length === 0 ? (
                <div style={styles.emptyState}>
                  <h4 style={{ color: '#888', margin: '0 0 10px 0' }}>Stáj je zatím prázdná</h4>
                  <p style={{ color: '#aaa', margin: 0 }}>Přidejte svého prvního koně kliknutím na tlačítko výše.</p>
                </div>
              ) : (
                <div style={styles.horseList}>
                  {myHorses.map(h => (
                    <div key={h.id} style={styles.horseCard}>
                      <div style={styles.horseCardHeader}>
                        <div>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', color: '#5d4037' }}>{h.name}</h4>
                          <span style={{ fontSize: '0.85rem', color: '#888', background: '#eee', padding: '3px 8px', borderRadius: '12px' }}>ID: {h.horse_id_number || 'Nezadáno'}</span>
                        </div>
                        <div style={styles.cardActions}>
                          <button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button>
                          <button onClick={() => deleteHorse(h.id, h.name)} style={styles.btnIconDelete}>🗑️</button>
                        </div>
                      </div>
                      
                      <div style={styles.horseCardBody}>
                        <div style={styles.infoRow}><strong>Rok narození:</strong> <span>{h.birth_year || '-'}</span></div>
                        
                        {/* Tyto hodnoty zatím budou prázdné, než je přidáme do DB */}
                        <div style={styles.infoRow}><strong>💉 Očkování vyprší:</strong> <span style={{color: '#d32f2f'}}>{h.vaccination_date || 'Nenastaveno'}</span></div>
                        <div style={styles.infoRow}><strong>⚒️ Kovář naplánován:</strong> <span style={{color: '#f57f17'}}>{h.farrier_date || 'Nenastaveno'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pravá část: Formulář (Karta koně) - Zobrazí se jen když přidáváme nebo upravujeme */}
            {isEditingHorse && (
              <div style={styles.formCard}>
                <h3 style={{ margin: '0 0 20px 0', color: '#5d4037', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                  {currentHorseId ? 'Úprava karty koně' : 'Nová karta koně'}
                </h3>
                
                <form onSubmit={handleSaveHorse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* Základní údaje (už fungují) */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Jméno koně *</label>
                    <input type="text" value={horseData.name} onChange={e => setHorseData({...horseData, name: e.target.value})} style={styles.input} required />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{...styles.formGroup, flex: 1}}>
                      <label style={styles.formLabel}>Rok narození</label>
                      <input type="number" value={horseData.birth_year} onChange={e => setHorseData({...horseData, birth_year: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{...styles.formGroup, flex: 1}}>
                      <label style={styles.formLabel}>ID / Číslo průkazu</label>
                      <input type="text" value={horseData.horse_id_number} onChange={e => setHorseData({...horseData, horse_id_number: e.target.value})} style={styles.input} />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '10px 0' }} />
                  
                  {/* Nové funkce - připraveno pro budoucí propojení s DB */}
                  <h4 style={{ margin: 0, color: '#0288d1' }}>Zdravotní a stájový deník (Brzy aktivní)</h4>
                  
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{...styles.formGroup, flex: 1, minWidth: '150px'}}>
                      <label style={styles.formLabel}>Platnost očkování do</label>
                      <input type="date" value={horseData.vaccination_date} onChange={e => setHorseData({...horseData, vaccination_date: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{...styles.formGroup, flex: 1, minWidth: '150px'}}>
                      <label style={styles.formLabel}>Další termín kováře</label>
                      <input type="date" value={horseData.farrier_date} onChange={e => setHorseData({...horseData, farrier_date: e.target.value})} style={styles.input} />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Krmná dávka / Dieta / Poznámky</label>
                    <textarea 
                      value={horseData.diet_notes} 
                      onChange={e => setHorseData({...horseData, diet_notes: e.target.value})} 
                      style={{...styles.input, height: '80px', resize: 'vertical'}} 
                      placeholder="Např: 2 fanky ovsa ráno, seno namáčet..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{...styles.btnPrimary, flex: 2, margin: 0}}>💾 {currentHorseId ? 'Uložit změny' : 'Ustájit koně'}</button>
                    <button type="button" onClick={resetHorseForm} style={{...styles.btnOutline, flex: 1, margin: 0}}>Zrušit</button>
                  </div>
                </form>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// STYLY PRO MODUL STÁJE
const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d4037', fontSize: '1.2rem', fontWeight: 'bold' },
  
  topNav: { display: 'flex', background: '#3e2723', padding: '15px 20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' },
  btnNavOutline: { background: 'transparent', border: '2px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnNavSignOut: { background: '#d32f2f', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  
  mainContent: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  welcomePanel: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: '30px', borderLeft: '6px solid #8d6e63' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' },
  
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box' },
  formCard: { backgroundColor: '#fafafa', padding: '25px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)' },
  
  emptyState: { textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '12px', border: '2px dashed #ccc' },
  horseList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  horseCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #5d4037', transition: 'transform 0.2s' },
  horseCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' },
  cardActions: { display: 'flex', gap: '5px' },
  horseCardBody: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#333' },
  infoRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px' },
  
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  formLabel: { fontSize: '0.85rem', fontWeight: 'bold', color: '#666' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' },
  inputSmall: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  
  btnAdd: { background: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  btnPrimary: { background: '#5d4037', color: 'white', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnOutline: { background: 'transparent', border: '1px solid #888', color: '#555', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnIconEdit: { background: '#e3f2fd', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem' },
  btnIconDelete: { background: '#ffebee', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', marginTop: '15px', width: '100%', cursor: 'pointer' },
};
