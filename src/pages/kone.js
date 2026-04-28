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

  // DENÍK, SOUBORY A KALENDÁŘ
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [diaryLogs, setDiaryLogs] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Jízdárna', notes: '', selectedEventName: '', cost: 0, rating: 0 
  });
  
  // Stavy pro zobrazení kalendáře
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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
    if (expandedDiaryId === horseId) { 
      setExpandedDiaryId(null); 
      setDiaryLogs([]); 
    } else {
      setExpandedDiaryId(horseId);
      setCalendarMonth(new Date()); // Otevřít kalendář na aktuálním měsíci
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
      setNewLog({ date: newLog.date, type: 'Jízdárna', notes: '', selectedEventName: '', cost: 0, rating: 0 }); // Zachovat vybrané datum z kalendáře
      setDocFile(null);
    }
  };

  const deleteDiaryLog = async (logId, horseId) => {
    if(confirm('Opravdu smazat tento záznam z deníku?')) {
      await supabase.from('horse_diary').delete().eq('id', logId);
      const { data } = await supabase.from('horse_diary').select('*').eq('horse_id', horseId).order('date', { ascending: false });
      setDiaryLogs(data || []);
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

  // POMOCNÉ FUNKCE PRO KALENDÁŘ
  const changeMonth = (offset) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarMonth(newDate);
  };

  const getTypeColor = (type) => {
    const colors = {
      'Jízdárna': '#1976d2', 'Lonž': '#8e24aa', 'Terén': '#388e3c', 'Skoky': '#f57f17',
      'Závody': '#d32f2f', 'Odpočinek': '#9e9e9e', 'Veterinář': '#00838f', 'Zuby': '#00838f', 'Fyzio': '#00838f', 'Kovář': '#5d4037'
    };
    return colors[type] || '#333';
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // Po = 0, Ne = 6

    const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

    const daysArray = [];
    for (let i = 0; i < firstDay; i++) daysArray.push(null);
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

    return (
      <div style={{background: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '15px', marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <button onClick={() => changeMonth(-1)} style={styles.btnCalNav}>◀ Předchozí</button>
          <strong style={{fontSize: '1.2rem', color: '#5d4037'}}>{monthNames[month]} {year}</strong>
          <button onClick={() => changeMonth(1)} style={styles.btnCalNav}>Další ▶</button>
        </div>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 'bold', color: '#888', marginBottom: '5px', fontSize: '0.85rem'}}>
          <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px'}}>
          {daysArray.map((day, idx) => {
            if (!day) return <div key={idx} style={{background: '#f9f9f9', borderRadius: '4px', minHeight: '60px'}}></div>;
            
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = newLog.date === cellDateStr;
            const dayLogs = diaryLogs.filter(log => log.date === cellDateStr);

            return (
              <div 
                key={idx} 
                onClick={() => setNewLog({...newLog, date: cellDateStr})}
                style={{
                  border: isSelected ? '2px solid #0288d1' : '1px solid #eee',
                  background: isSelected ? '#e3f2fd' : '#fff',
                  borderRadius: '6px', minHeight: '60px', padding: '5px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.2s'
                }}
              >
                <span style={{fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#0288d1' : '#333'}}>{day}</span>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', marginTop: 'auto', width: '100%'}}>
                  {dayLogs.map(log => (
                    <div key={log.id} title={log.training_type} style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getTypeColor(log.training_type)}}></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
                          {isD ? ' zavřít deník' : '📖 Otevřít deník & kalendář'}
                        </button>

                        {isD && (
                          <div style={{marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px'}}>
                            
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', fontWeight:'bold', color:'#2e7d32', fontSize: '1.1rem'}}>
                              <span>Roční výdaje:</span> <span>{totalSpent.toLocaleString('cs-CZ')} Kč</span>
                            </div>

                            {/* ZDE JE NOVÝ KALENDÁŘ */}
                            {renderCalendar()}
                            
                            <h5 style={{margin: '0 0 10px 0', color: '#0288d1'}}>Záznam pro {new Date(newLog.date).toLocaleDateString('cs-CZ')}</h5>
                            <form onSubmit={(e) => saveDiaryLog(e, h.id)} style={{display:'grid', gap:'8px', gridTemplateColumns:'1fr 1fr', marginBottom:'25px'}}>
                              <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} />
                              <select value={newLog.type} onChange={e=>setNewLog({...newLog, type:e.target.value})} style={{...styles.inputSmall, background: getTypeColor(newLog.type), color: ['Odpočinek'].includes(newLog.type) ? '#000' : '#fff'}}>
                                <option value="Jízdárna">Jízdárna</option><option value="Lonž">Lonž</option>
                                <option value="Terén">Terén</option><option value="Skoky">Skoky</option>
                                <option value="Veterinář">Veterinář</option><option value="Zuby">Zuby</option>
                                <option value="Fyzio">Fyzio/Chiro</option><option value="Kovář">Kovář</option>
                                <option value="Odpočinek">Odpočinek</option><option value="Závody">Závody</option>
                              </select>

                              {newLog.type === 'Závody' && (
                                <select value={newLog.selectedEventName} onChange={e => setNewLog({...newLog, selectedEventName: e.target.value})} style={{...styles.inputSmall, gridColumn: 'span 2'}}>
                                  <option value="">-- Který závod v systému? --</option>
                                  {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
                                </select>
                              )}

                              <input type="number" placeholder="Cena v Kč" value={newLog.cost || ''} onChange={e=>setNewLog({...newLog, cost:parseInt(e.target.value)||0})} style={styles.inputSmall} />
                              <select value={newLog.rating} onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}>
                                <option value="0">Hodnocení dne</option><option value="5">⭐⭐⭐⭐⭐ Skvělé</option><option value="3">⭐⭐⭐ Ušlo to</option><option value="1">⭐ Katastrofa</option>
                              </select>
                              <div style={{gridColumn:'span 2'}}>
                                <label style={{fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '2px'}}>Příloha / Zpráva (PDF/JPG)</label>
                                <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{width: '100%', fontSize:'0.75rem', padding: '5px', background: '#fff', border: '1px solid #ccc', borderRadius: '4px'}} />
                              </div>
                              <textarea placeholder="Co se dělalo, poznámky k tréninku..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{gridColumn:'span 2', padding:'8px', borderRadius: '6px', border: '1px solid #ccc', height: '60px'}} />
                              <button type="submit" style={{gridColumn:'span 2', background:'#0288d1', color:'#fff', border:'none', padding:'12px', borderRadius:'6px', fontWeight: 'bold', cursor: 'pointer'}}>Uložit do deníku</button>
                            </form>

                            <h5 style={{margin: '0 0 10px 0', color: '#5d4037'}}>Předchozí záznamy:</h5>
                            {diaryLogs.map(log => (
                              <div key={log.id} style={{fontSize:'0.85rem', padding:'12px', background: '#fff', borderRadius: '8px', borderLeft:`4px solid ${getTypeColor(log.training_type)}`, marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                  <strong style={{fontSize: '1rem', color: '#333'}}>{new Date(log.date).toLocaleDateString()} - {log.training_type}</strong>
                                  <button onClick={() => deleteDiaryLog(log.id, h.id)} style={{background:'none', border:'none', color:'#d32f2f', cursor:'pointer', fontSize:'0.8rem'}}>Smazat</button>
                                </div>
                                {log.rating > 0 && <div style={{marginBottom: '5px'}}>{'⭐'.repeat(log.rating)}</div>}
                                <div style={{color:'#555', whiteSpace: 'pre-wrap', lineHeight: '1.4'}}>{log.notes}</div>
                                <div style={{display: 'flex', gap: '15px', marginTop: '8px', borderTop: '1px dashed #eee', paddingTop: '8px'}}>
                                  {log.cost > 0 && <span style={{color:'#2e7d32', fontWeight:'bold'}}>💰 {log.cost} Kč</span>}
                                  {log.attachment_url && <a href={log.attachment_url} target="_blank" rel="noopener noreferrer" style={{color:'#0288d1', fontWeight: 'bold', textDecoration: 'none'}}>📎 Otevřít přílohu</a>}
                                </div>
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
  btnCalNav: { background: '#eee', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333' },
  mainGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', maxWidth: '1400px', margin: '0 auto', padding: '20px' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037' },
  horseCard: { background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #5d4037' },
  formCard: { backgroundColor: '#fafafa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' },
  btnAdd: { background: '#4caf50', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold' },
  btnPrimary: { background: '#5d4037', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' },
  btnOutline: { background: 'transparent', border: '1px solid #888', padding: '10px', borderRadius: '6px' },
  btnIconEdit: { background: '#e3f2fd', border: 'none', padding: '5px', borderRadius: '4px' },
  btnIconDelete: { background: '#ffebee', border: 'none', padding: '5px', borderRadius: '4px' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', width: '100%', marginTop: '10px' },
  btnSignOut: { background: '#e57373', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', marginTop: '10px', width: '100%' }
};
