/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const getHealthStatus = (dateString) => {
  if (!dateString) return { text: '', status: 'none', color: '#888', bgColor: '#f5f5f5' };
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `(Propadlé o ${Math.abs(diffDays)} dní!)`, color: '#d32f2f', bgColor: '#ffebee' };
  if (diffDays <= 14) return { text: `(Zbývá ${diffDays} dní)`, color: '#e65100', bgColor: '#fff8e1' };
  return { text: `(V pořádku, zbývá ${diffDays} dní)`, color: '#2e7d32', bgColor: '#e8f5e9' };
};

export default function StajoveImperium() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [myHorses, setMyHorses] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEditingHorse, setIsEditingHorse] = useState(false);
  const [currentHorseId, setCurrentHorseId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [horseData, setHorseData] = useState({
    name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: ''
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // DENÍK A SOUBORY
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [diaryLogs, setDiaryLogs] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Jízdárna', notes: '', selectedEventName: '', cost: 0, rating: 0 
  });

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        await fetchMyHorses(authUser.id);
        await fetchEvents();
      }
    } finally { setLoading(false); }
  }

  async function fetchMyHorses(userId) {
    const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    setMyHorses(horses || []);
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false });
    setEvents(data || []);
  }

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email, license_type: 'Hobby' }]);
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message); else window.location.reload();
    }
    setLoading(false);
  };

  const toggleDiary = async (horseId) => {
    if (expandedDiaryId === horseId) { setExpandedDiaryId(null); setDiaryLogs([]); }
    else {
      setExpandedDiaryId(horseId);
      const { data } = await supabase.from('horse_diary').select('*').eq('horse_id', horseId).order('date', { ascending: false });
      setDiaryLogs(data || []);
    }
  };

  const saveDiaryLog = async (e, horseId) => {
    e.preventDefault();
    let attUrl = null;
    if (docFile) {
      const fExt = docFile.name.split('.').pop();
      const fName = `${Math.random()}.${fExt}`;
      const { error: upErr } = await supabase.storage.from('horse_docs').upload(fName, docFile);
      if (!upErr) {
        const { data } = supabase.storage.from('horse_docs').getPublicUrl(fName);
        attUrl = data.publicUrl;
      }
    }

    let finalNotes = newLog.notes;
    if (newLog.type === 'Závody' && newLog.selectedEventName) { finalNotes = `[${newLog.selectedEventName}] ${finalNotes}`; }

    const { error } = await supabase.from('horse_diary').insert([{ 
      horse_id: horseId, date: newLog.date, training_type: newLog.type, notes: finalNotes, 
      cost: newLog.cost, rating: newLog.rating, attachment_url: attUrl 
    }]);
    
    if (error) alert(error.message);
    else {
      const { data } = await supabase.from('horse_diary').select('*').eq('horse_id', horseId).order('date', { ascending: false });
      setDiaryLogs(data || []);
      setNewLog({ date: new Date().toISOString().split('T')[0], type: 'Jízdárna', notes: '', selectedEventName: '', cost: 0, rating: 0 });
      setDocFile(null);
    }
  };

  const deleteHorse = async (id, name) => {
    if (confirm(`Smazat koně ${name}?`)) {
      await supabase.from('horses').delete().eq('id', id);
      fetchMyHorses(user.id);
    }
  };

  const resetHorseForm = () => {
    setHorseData({ name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: '' });
    setPhotoFile(null); setCurrentHorseId(null); setIsEditingHorse(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    await supabase.from('profiles').update({
      full_name: profile.full_name, phone: profile.phone, stable: profile.stable, city: profile.city, birth_date: profile.birth_date, license_type: profile.license_type
    }).eq('id', user.id);
    setEditMode(false);
  };

  const handleSaveHorse = async (e) => {
    e.preventDefault();
    let finalPhotoUrl = horseData.photo_url;
    if (photoFile) {
      const fExt = photoFile.name.split('.').pop();
      const fName = `${Math.random()}.${fExt}`;
      await supabase.storage.from('horse_photos').upload(fName, photoFile);
      const { data } = supabase.storage.from('horse_photos').getPublicUrl(fName);
      finalPhotoUrl = data.publicUrl;
    }
    const payload = {
      owner_id: user.id, name: horseData.name, birth_year: horseData.birth_year, horse_id_number: horseData.horse_id_number,
      vaccination_date: horseData.vaccination_date || null, farrier_date: horseData.farrier_date || null, diet_notes: horseData.diet_notes, photo_url: finalPhotoUrl
    };
    if (currentHorseId) await supabase.from('horses').update(payload).eq('id', currentHorseId);
    else await supabase.from('horses').insert([payload]);
    resetHorseForm(); fetchMyHorses(user.id);
  };

  const editHorse = (h) => {
    setHorseData({ ...h, vaccination_date: h.vaccination_date || '', farrier_date: h.farrier_date || '' });
    setCurrentHorseId(h.id); setIsEditingHorse(true);
  };

  if (loading) return <div style={styles.loader}>Otevírám vrata stáje...</div>;

  return (
    <div style={styles.container}>
      <style>{mobileStyles}</style>
      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>☰</button>
            <h2 style={{ margin: 0, color: '#fff' }}>🐴 Moje Stáj</h2>
          </div>
          <button onClick={() => window.location.href = '/'} style={styles.btnNavOutline}>🔙 Zpět na Závody</button>
        </div>
      )}

      {!user ? (
        <div style={{...styles.card, maxWidth: '400px', margin: '40px auto'}}>
          <h2 style={{textAlign: 'center', color: '#5d4037'}}>Vítejte ve stáji</h2>
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT' : 'VSTOUPIT'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>{isSignUp ? 'Přihlásit se' : 'Nová registrace'}</button>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <h3 style={{marginTop: 0}}>👤 Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile} style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <input style={styles.inputSmall} value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} placeholder="Jméno" />
                <select style={styles.inputSmall} value={profile?.license_type || 'Hobby'} onChange={e => setProfile({...profile, license_type: e.target.value})}>
                  <option value="Hobby">Licence: Hobby</option>
                  <option value="ZZVJ">Licence: ZZVJ</option>
                  <option value="Profi">Licence: Profi</option>
                </select>
                <input style={styles.inputSmall} value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} placeholder="Hospodářství" />
                <button type="submit" style={styles.btnSave}>Uložit</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name}</strong> <span style={{fontSize:'0.7rem', background:'#ffb300', padding:'2px 6px', borderRadius:'10px'}}>{profile?.license_type}</span></p>
                <p style={{fontSize:'0.8rem', color:'#666'}}>{profile?.stable || 'Bez stáje'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit profil</button>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={styles.btnSignOut}>Odhlásit</button>
              </div>
            )}
          </div>

          <div className="main-content">
            <div style={styles.contentGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#3e2723' }}>Moje koně</h3>
                  <button onClick={() => setIsEditingHorse(true)} style={styles.btnAdd}>+ Nový kůň</button>
                </div>

                <div style={styles.horseList}>
                  {myHorses.map(h => {
                    const vacS = getHealthStatus(h.vaccination_date);
                    const farS = getHealthStatus(h.farrier_date);
                    const isD = expandedDiaryId === h.id;
                    const totalSpent = diaryLogs.reduce((acc, l) => acc + (l.cost || 0), 0);

                    return (
                      <div key={h.id} style={styles.horseCard}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                          <img src={h.photo_url || 'https://via.placeholder.com/80?text=KŮŇ'} style={{width:'60px', height:'60px', borderRadius:'50%', objectFit:'cover', border:'2px solid #5d4037'}} />
                          <div style={{flex:1}}><h4 style={{margin:0}}>{h.name}</h4><small>{h.birth_year}</small></div>
                          <button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button>
                          <button onClick={() => deleteHorse(h.id, h.name)} style={styles.btnIconDelete}>🗑️</button>
                        </div>
                        
                        <div style={styles.infoRow}>💉 Očkování: <span style={{color:vacS.color}}>{h.vaccination_date ? new Date(h.vaccination_date).toLocaleDateString() : '!!!'}</span></div>
                        <div style={styles.infoRow}>⚒️ Kovář: <span style={{color:farS.color}}>{h.farrier_date ? new Date(h.farrier_date).toLocaleDateString() : '!!!'}</span></div>
                        
                        <button onClick={() => toggleDiary(h.id)} style={{...styles.btnOutline, width:'100%', marginTop:'10px'}}>
                          {isD ? ' zavřít deník' : '📖 Otevřít deník & výdaje'}
                        </button>

                        {isD && (
                          <div style={{marginTop:'15px', background:'#f9f9f9', padding:'10px', borderRadius:'8px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', fontWeight:'bold', color:'#2e7d32'}}>
                              <span>Celkové výdaje:</span> <span>{totalSpent} Kč</span>
                            </div>
                            
                            <form onSubmit={(e) => saveDiaryLog(e, h.id)} style={{display:'grid', gap:'8px', gridTemplateColumns:'1fr 1fr', marginBottom:'15px'}}>
                              <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} />
                              <select value={newLog.type} onChange={e=>setNewLog({...newLog, type:e.target.value})} style={styles.inputSmall}>
                                <option value="Jízdárna">Jízdárna</option><option value="Veterinář">Veterinář</option>
                                <option value="Zuby">Zuby</option><option value="Fyzio">Fyzio/Chiro</option>
                                <option value="Závody">Závody</option><option value="Kovář">Kovář</option>
                              </select>
                              <input type="number" placeholder="Cena v Kč" onChange={e=>setNewLog({...newLog, cost:parseInt(e.target.value)||0})} style={styles.inputSmall} />
                              <select onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}>
                                <option value="0">Hodnocení</option><option value="5">⭐⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="1">⭐</option>
                              </select>
                              <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{gridColumn:'span 2', fontSize:'0.7rem'}} />
                              <textarea placeholder="Poznámka..." onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{gridColumn:'span 2', padding:'5px'}} />
                              <button type="submit" style={{gridColumn:'span 2', background:'#0288d1', color:'#fff', border:'none', padding:'8px', borderRadius:'5px'}}>Uložit záznam</button>
                            </form>

                            {diaryLogs.map(log => (
                              <div key={log.id} style={{fontSize:'0.85rem', padding:'8px', borderBottom:'1px solid #eee', position:'relative'}}>
                                <strong>{new Date(log.date).toLocaleDateString()} - {log.training_type}</strong>
                                {log.rating > 0 && <span style={{marginLeft:'10px'}}>{'⭐'.repeat(log.rating)}</span>}
                                <div style={{color:'#666'}}>{log.notes}</div>
                                {log.cost > 0 && <div style={{color:'#2e7d32', fontWeight:'bold'}}>{log.cost} Kč</div>}
                                {log.attachment_url && <a href={log.attachment_url} target="_blank" style={{color:'#0288d1', fontSize:'0.7rem'}}>📄 Zobrazit přílohu</a>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isEditingHorse && (
                <div style={styles.formCard}>
                  <h3>{currentHorseId ? 'Upravit' : 'Nový kůň'}</h3>
                  <form onSubmit={handleSaveHorse} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
                    <input placeholder="Jméno" value={horseData.name} onChange={e=>setHorseData({...horseData, name:e.target.value})} style={styles.input} required />
                    <input type="date" value={horseData.vaccination_date} onChange={e=>setHorseData({...horseData, vaccination_date:e.target.value})} style={styles.input} />
                    <input type="date" value={horseData.farrier_date} onChange={e=>setHorseData({...horseData, farrier_date:e.target.value})} style={styles.input} />
                    <button type="submit" style={styles.btnPrimary}>Uložit koně</button>
                    <button type="button" onClick={resetHorseForm} style={styles.btnOutline}>Zrušit</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mobileStyles = `@media (max-width: 768px) { .sidebar { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; z-index: 1000; transition: left 0.3s ease; background: white; box-shadow: 2px 0 10px rgba(0,0,0,0.2); overflow-y: auto; } .sidebar.open { left: 0; } .main-grid { display: block !important; } .mobile-only { display: block !important; } } .mobile-only { display: none; }`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  topNav: { display: 'flex', background: '#3e2723', padding: '15px', alignItems: 'center', justifyContent: 'space-between' },
  hamburgerBtn: { background: '#ffb300', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', maxWidth: '1400px', margin: '0 auto', padding: '20px' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037' },
  horseCard: { background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #5d4037' },
  formCard: { backgroundColor: '#fafafa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', width: '100%' },
  btnAdd: { background: '#4caf50', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold' },
  btnPrimary: { background: '#5d4037', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' },
  btnOutline: { background: 'transparent', border: '1px solid #888', padding: '10px', borderRadius: '6px' },
  btnIconEdit: { background: '#e3f2fd', border: 'none', padding: '5px', borderRadius: '4px' },
  btnIconDelete: { background: '#ffebee', border: 'none', padding: '5px', borderRadius: '4px' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', width: '100%', marginTop: '10px' },
  btnSignOut: { background: '#e57373', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', marginTop: '10px', width: '100%' }
};
