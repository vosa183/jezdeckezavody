/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function StajoveImperium() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [myHorses, setMyHorses] = useState([]);
  const [isEditingHorse, setIsEditingHorse] = useState(false);
  const [currentHorseId, setCurrentHorseId] = useState(null);
  
  // Přibyl stav pro nahrávanou fotku a url do databáze
  const [photoFile, setPhotoFile] = useState(null);
  const [horseData, setHorseData] = useState({
    name: '',
    birth_year: '',
    horse_id_number: '',
    vaccination_date: '', 
    farrier_date: '',     
    diet_notes: '',
    photo_url: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        await fetchMyHorses(authUser.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyHorses(userId) {
    const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
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
    
    let finalPhotoUrl = horseData.photo_url;

    // Pokud uživatel vybral novou fotku, nejprve ji nahrajeme do Supabase
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('horse_photos').upload(fileName, photoFile);
      
      if (uploadError) {
        alert('Chyba při nahrávání fotky: ' + uploadError.message);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('horse_photos').getPublicUrl(fileName);
      finalPhotoUrl = urlData.publicUrl;
    }

    const payload = {
      owner_id: user.id,
      name: horseData.name,
      birth_year: horseData.birth_year,
      horse_id_number: horseData.horse_id_number,
      vaccination_date: horseData.vaccination_date || null, 
      farrier_date: horseData.farrier_date || null,
      diet_notes: horseData.diet_notes,
      photo_url: finalPhotoUrl
    };

    if (currentHorseId) {
      const { error } = await supabase.from('horses').update(payload).eq('id', currentHorseId);
      if (error) alert(error.message);
      else alert('Karta koně aktualizována!');
    } else {
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
      vaccination_date: h.vaccination_date || '',
      farrier_date: h.farrier_date || '',         
      diet_notes: h.diet_notes || '',
      photo_url: h.photo_url || ''
    });
    setPhotoFile(null);
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
    setHorseData({ name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: '' });
    setPhotoFile(null);
    setCurrentHorseId(null);
    setIsEditingHorse(false);
  };

  if (loading) return <div style={styles.loader}>Otevírám vrata stáje...</div>;

  return (
    <div style={styles.container}>
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
          
          <div style={styles.welcomePanel}>
            <h2 style={{ margin: '0 0 5px 0', color: '#5d4037' }}>Vítejte, {profile?.full_name || 'Neznámý jezdci'}!</h2>
            <p style={{ margin: 0, color: '#666' }}>Tady je vaše osobní centrála pro správu koňských parťáků. Plánujte tréninky, hlídejte očkování a mějte vše na jednom místě.</p>
          </div>

          <div style={styles.grid}>
            
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
                      
                      {/* NOVÉ: Zobrazení profilové fotky koně */}
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#eee', overflow: 'hidden', border: '3px solid #5d4037', flexShrink: 0 }}>
                          {h.photo_url ? (
                            <img src={h.photo_url} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🐴</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: '#5d4037' }}>{h.name}</h4>
                          <span style={{ fontSize: '0.85rem', color: '#888', background: '#f5f5f5', padding: '3px 8px', borderRadius: '12px' }}>ID: {h.horse_id_number || 'Nezadáno'}</span>
                        </div>
                        <div style={styles.cardActions}>
                          <button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button>
                          <button onClick={() => deleteHorse(h.id, h.name)} style={styles.btnIconDelete}>🗑️</button>
                        </div>
                      </div>
                      
                      <div style={styles.horseCardBody}>
                        <div style={styles.infoRow}><strong>Rok narození:</strong> <span>{h.birth_year || '-'}</span></div>
                        <div style={styles.infoRow}><strong>💉 Očkování vyprší:</strong> <span style={{color: '#d32f2f', fontWeight: 'bold'}}>{h.vaccination_date ? new Date(h.vaccination_date).toLocaleDateString('cs-CZ') : 'Nenastaveno'}</span></div>
                        <div style={styles.infoRow}><strong>⚒️ Kovář naplánován:</strong> <span style={{color: '#f57f17', fontWeight: 'bold'}}>{h.farrier_date ? new Date(h.farrier_date).toLocaleDateString('cs-CZ') : 'Nenastaveno'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isEditingHorse && (
              <div style={styles.formCard}>
                <h3 style={{ margin: '0 0 20px 0', color: '#5d4037', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                  {currentHorseId ? 'Úprava karty koně' : 'Nová karta koně'}
                </h3>
                
                <form onSubmit={handleSaveHorse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* NOVÉ: Nahrávání fotky */}
                  <div style={{...styles.formGroup, background: '#e3f2fd', padding: '10px', borderRadius: '8px', border: '1px solid #90caf9'}}>
                    <label style={{...styles.formLabel, color: '#0288d1'}}>Profilová fotka (JPG/PNG)</label>
                    <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{fontSize: '0.9rem'}} />
                    {horseData.photo_url && !photoFile && <span style={{fontSize: '0.8rem', color: '#666', marginTop: '5px'}}>Kůň už má fotku nahranou.</span>}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Jméno koně *</label>
                    <input type="text" value={horseData.name} onChange={e => setHorseData({...horseData, name: e.target.value})} style={styles.input} required />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                      <label style={styles.formLabel}>Rok narození</label>
                      <input type="number" value={horseData.birth_year} onChange={e => setHorseData({...horseData, birth_year: e.target.value})} style={styles.input} />
                    </div>
                    <div style={{...styles.formGroup, flex: 1, minWidth: '120px'}}>
                      <label style={styles.formLabel}>ID / Průkaz</label>
                      <input type="text" value={horseData.horse_id_number} onChange={e => setHorseData({...horseData, horse_id_number: e.target.value})} style={styles.input} />
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '5px 0' }} />
                  
                  <h4 style={{ margin: 0, color: '#0288d1' }}>Zdravotní a stájový deník</h4>
                  
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
  horseCardBody: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem', color: '#333', background: '#fafafa', padding: '10px', borderRadius: '8px' },
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
