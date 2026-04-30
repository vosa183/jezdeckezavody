/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
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
  
  if (diffDays < 0) return { text: `(Propadlé!)`, color: '#d32f2f', bgColor: '#ffebee' };
  if (diffDays <= 14) return { text: `(Zbývá ${diffDays} dní)`, color: '#e65100', bgColor: '#fff8e1' };
  return { text: `(V pořádku)`, color: '#2e7d32', bgColor: '#e8f5e9' };
};

const HORSE_COLORS = ['#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39'];

export default function PortalJezdec() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  
  const [myMemberships, setMyMemberships] = useState([]); 
  const [clientHorses, setClientHorses] = useState([]); 
  const [allDiaryLogs, setAllDiaryLogs] = useState([]);
  
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('kone'); 
  
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [docFile, setDocFile] = useState(null);
  
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Jízdárna', 
    notes: '', 
    rating: 0
  });

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarDetailDate, setCalendarDetailDate] = useState(null);

  useEffect(() => { 
    checkUserAndToken(); 
  }, []);

  async function checkUserAndToken() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser && token) {
        const { data: invData } = await supabase.from('invitations').select('*').eq('token', token).single();
        
        if (invData && !invData.is_accepted && invData.email === authUser.email) {
          const { data: existingMember } = await supabase.from('club_members').select('*').eq('club_id', invData.club_id).eq('user_id', authUser.id).single();
          
          if (!existingMember) {
            await supabase.from('club_members').insert([{ 
              club_id: invData.club_id, 
              user_id: authUser.id, 
              role: invData.role 
            }]);
          }
          
          await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (!authUser && token) {
        setInviteToken(token); 
        setIsSignUp(true);
        const { data: invData } = await supabase.from('invitations').select('*').eq('token', token).single();
        
        if (invData && !invData.is_accepted) {
          setEmail(invData.email);
        }
      }

      if (authUser) {
        const { data: memberships } = await supabase.from('club_members').select('club_id, role, clubs(name)').eq('user_id', authUser.id);
        
        if (memberships && memberships.length > 0) {
          // KONTROLA ROLE JEZDCE
          // Pro teď povolíme jezdce, pokud má jakoukoliv roli ve stáji, 
          // ale v budoucnu zde můžeme striktně filtrovat 'rider'
          setMyMemberships(memberships);
          const clubIds = memberships.map(m => m.club_id);
          
          if (clubIds.length > 0) {
            const { data: horses } = await supabase.from('horses').select('*').in('club_id', clubIds).order('name', { ascending: true });
            setClientHorses(horses || []);
            
            if (horses && horses.length > 0) {
              const horseIds = horses.map(h => h.id);
              const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
              setAllDiaryLogs(logs || []);
            }
          }
        }
        
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
      }
    } finally { 
      setLoading(false); 
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        alert(error.message);
      } else if (data?.user) {
        if (inviteToken) {
          const { data: invData } = await supabase.from('invitations').select('*').eq('token', inviteToken).single();
          
          if (invData && !invData.is_accepted) {
            await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
            await supabase.from('club_members').insert([{ 
              club_id: invData.club_id, 
              user_id: data.user.id, 
              role: invData.role 
            }]);
            await supabase.from('profiles').insert([{ 
              id: data.user.id, 
              email: email, 
              license_type: 'Hobby', 
              club_id: invData.club_id 
            }]);
          }
        }
        window.location.href = window.location.pathname;
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Chybné přihlášení: ' + error.message); 
      } else {
        window.location.href = window.location.pathname;
      }
    }
    setLoading(false);
  };

  const updateProfileDetails = async (e) => {
    e.preventDefault();
    await supabase.from('profiles').update({ 
      full_name: profile.full_name,
      license_type: profile.license_type
    }).eq('id', user.id);
    
    setIsProfileEditing(false);
    alert('Profil aktualizován.');
  };

  const getHorseColor = (horseId) => {
    return HORSE_COLORS[clientHorses.findIndex(h => h.id === horseId) % HORSE_COLORS.length] || '#333';
  };

  const getTypeColor = (type) => { 
    const colors = { 
      'Jízdárna': '#1976d2', 
      'Lonž': '#8e24aa', 
      'Terén': '#388e3c', 
      'Skoky': '#f57f17', 
      'Odpočinek': '#9e9e9e',
      'Závody': '#e65100',
      'Veterinář': '#00838f',
      'Kovář': '#5d4037'
    }; 
    return colors[type] || '#333'; 
  };

  const toggleDiary = (horseId) => { 
    if (expandedDiaryId === horseId) {
      setExpandedDiaryId(null); 
    } else { 
      setExpandedDiaryId(horseId); 
      setNewLog({ 
        date: new Date().toISOString().split('T')[0], 
        type: 'Jízdárna', 
        notes: '', 
        rating: 0 
      }); 
    } 
  };

  const submitLog = async (e, clubId) => {
    e.preventDefault(); 
    let attUrl = null;
    
    if (docFile) {
      const fExt = docFile.name.split('.').pop(); 
      const fName = `ride_${Math.random()}.${fExt}`;
      const { error: upErr } = await supabase.storage.from('horse_docs').upload(fName, docFile);
      if (!upErr) { 
        const { data } = supabase.storage.from('horse_docs').getPublicUrl(fName); 
        attUrl = data.publicUrl; 
      }
    }
    
    const { error } = await supabase.from('horse_diary').insert([{ 
      horse_id: expandedDiaryId, 
      club_id: clubId, 
      date: newLog.date, 
      training_type: newLog.type, 
      notes: newLog.notes, 
      cost: 0,
      rating: newLog.rating, 
      attachment_url: attUrl 
    }]);

    if (error) {
      alert(error.message);
    } else { 
      alert('Trénink byl zapsán do deníku!'); 
      const horseIds = clientHorses.map(h => h.id);
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
      setAllDiaryLogs(logs || []);
      
      setNewLog({ 
        date: new Date().toISOString().split('T')[0], 
        type: 'Jízdárna', 
        notes: '', 
        rating: 0 
      }); 
      setDocFile(null); 
    }
  };

  const changeMonth = (offset) => { 
    const newDate = new Date(calendarMonth); 
    newDate.setMonth(newDate.getMonth() + offset); 
    setCalendarMonth(newDate); 
  };

  const renderGlobalCalendar = () => {
    if (clientHorses.length === 0) return null;
    const year = calendarMonth.getFullYear(); 
    const month = calendarMonth.getMonth(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay(); 
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
    const daysArray = []; 
    for (let i = 0; i < firstDay; i++) daysArray.push(null); 
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);
    
    return (
      <div style={{ background: '#fff', borderRadius: '8px', padding: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: '20px', border: '1px solid #eee' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#3f51b5', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>📅 Plán práce</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
          {clientHorses.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHorseColor(h.id) }}></div>
              <span>{h.name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={() => changeMonth(-1)} style={styles.btnCalNavSmall}>◀</button>
          <strong style={{ fontSize: '0.85rem', color: '#3f51b5' }}>{monthNames[month]} {year}</strong>
          <button onClick={() => changeMonth(1)} style={styles.btnCalNavSmall}>▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontWeight: 'bold', color: '#888', marginBottom: '4px', fontSize: '0.65rem' }}>
          <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {daysArray.map((day, idx) => {
            if (!day) return <div key={idx} style={{ background: '#f9f9f9', borderRadius: '4px', minHeight: '30px' }}></div>;
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
            const dayLogs = allDiaryLogs.filter(log => log.date === cellDateStr);
            return (
              <div 
                key={idx} 
                onClick={() => setCalendarDetailDate(cellDateStr)} 
                style={{ border: '1px solid #eee', background: '#fff', borderRadius: '4px', minHeight: '30px', padding: '2px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.75rem', color: '#333' }}>{day}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', justifyContent: 'center', marginTop: 'auto', width: '100%' }}>
                  {dayLogs.map(log => ( 
                    <div key={log.id} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: getHorseColor(log.horse_id) }}></div> 
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarDetailModal = () => {
    if (!calendarDetailDate) return null;
    const logsForDay = allDiaryLogs.filter(l => l.date === calendarDetailDate);
    
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#1a237e' }}>📅 {new Date(calendarDetailDate).toLocaleDateString('cs-CZ')}</h3>
            <button onClick={() => setCalendarDetailDate(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
          </div>
          {logsForDay.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>Žádná zaznamenaná práce.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logsForDay.map(log => { 
                const horse = clientHorses.find(h => h.id === log.horse_id); 
                return (
                  <div key={log.id} style={{ padding: '12px', borderRadius: '8px', borderLeft: `5px solid ${getHorseColor(log.horse_id)}`, background: '#fafafa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ color: '#333' }}>{horse?.name || 'Kůň'}</strong>
                      <span style={{ background: getTypeColor(log.training_type), color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>{log.training_type}</span>
                    </div>
                    {log.rating > 0 && <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{'⭐'.repeat(log.rating)}</div>}
                    <div style={{ color: '#555', fontSize: '0.85rem' }}>{log.notes}</div>
                  </div>
                ); 
              })}
            </div>
          )}
          <button 
            onClick={() => { setNewLog({...newLog, date: calendarDetailDate}); setCalendarDetailDate(null); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} 
            style={{ ...styles.btnPrimary, width: '100%', marginTop: '20px' }}
          >
            + Zapsat trénink na tento den
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loader}>
        Připravuji sedlovnu...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Head>
        <title>Portál Jezdce | Jezdecké Impérium</title>
      </Head>
      <style>{mobileStyles}</style>
      {renderCalendarDetailModal()}

      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>
              ☰ Jezdec
            </button>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
              🏇 Portál Jezdce (JE)
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#e8eaf6', fontSize: '0.9rem' }}>
              {profile?.full_name || profile?.email}
            </span>
            <button 
              onClick={() => supabase.auth.signOut().then(() => window.location.reload())} 
              style={styles.btnNavOutline}
            >
              Odhlásit
            </button>
          </div>
        </div>
      )}

      {!user ? (
        <div style={{ ...styles.card, maxWidth: '400px', margin: '60px auto', borderTop: '5px solid #3f51b5' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {inviteToken ? (
              <div style={{ background: '#e8eaf6', padding: '15px', borderRadius: '8px', border: '2px solid #3f51b5' }}>
                <h3 style={{ color: '#3f51b5', margin: '0 0 5px 0' }}>Byl jste pozván jako jezdec!</h3>
                <p style={{ margin: 0, color: '#333' }}>Přihlaste se pro sledování svých tréninků.</p>
              </div>
            ) : (
              <>
                <h1 style={{ color: '#3f51b5', margin: '0 0 10px 0' }}>Vstup pro jezdce</h1>
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Nasedat, trénink začíná.</p>
              </>
            )}
          </div>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="email" 
              placeholder="Váš e-mail" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={styles.input} 
              required 
              disabled={!!inviteToken && isSignUp} 
            />
            <input 
              type="password" 
              placeholder="Vaše heslo" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={styles.input} 
              required 
            />
            <button type="submit" style={{...styles.btnPrimary, background: '#3f51b5'}}>
              {isSignUp ? 'DOKONČIT REGISTRACI' : 'PŘIHLÁSIT SE'}
            </button>
          </form>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{...styles.btnText, color: '#3f51b5'}}
          >
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se.'}
          </button>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee' }}>
              <button 
                onClick={() => setSidebarTab('kone')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'kone' ? '3px solid #3f51b5' : 'none', color: sidebarTab === 'kone' ? '#3f51b5' : '#888' }}
              >
                🐴 Moje koně
              </button>
              <button 
                onClick={() => setSidebarTab('profil')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #3f51b5' : 'none', color: sidebarTab === 'profil' ? '#3f51b5' : '#888' }}
              >
                👤 Můj Profil
              </button>
            </div>

            {sidebarTab === 'profil' && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#3f51b5' }}>Osobní údaje</h4>
                {isProfileEditing ? (
                  <form onSubmit={updateProfileDetails} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={styles.formLabel}>Jméno a příjmení</label>
                    <input 
                      type="text" 
                      value={profile?.full_name || ''} 
                      onChange={e => setProfile({...profile, full_name: e.target.value})} 
                      style={styles.inputSmall} 
                      required 
                    />
                    <label style={styles.formLabel}>Licence / Úroveň</label>
                    <select 
                      style={styles.inputSmall} 
                      value={profile?.license_type || 'Hobby'} 
                      onChange={e => setProfile({...profile, license_type: e.target.value})}
                    >
                      <option value="Hobby">Hobby</option>
                      <option value="ZZVJ">ZZVJ</option>
                      <option value="Profi">Profi jezdec</option>
                    </select>
                    <button type="submit" style={{ ...styles.btnPrimary, background: '#4caf50' }}>Uložit profil</button>
                    <button type="button" onClick={() => setIsProfileEditing(false)} style={styles.btnOutline}>Zrušit</button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name || 'Jezdec'}</strong></p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Licence: {profile?.license_type || 'Neuvedeno'}</p>
                    <button onClick={() => setIsProfileEditing(true)} style={{ ...styles.btnOutline, width: '100%', marginTop: '10px' }}>
                      Upravit profil
                    </button>
                  </div>
                )}
                {renderGlobalCalendar()}
              </div>
            )}

            {sidebarTab === 'kone' && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#3f51b5' }}>Moje stáje</h4>
                {myMemberships.map((m, idx) => (
                  <div key={idx} style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #3f51b5' }}>
                    <strong>🏢 {m.clubs?.name}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

          <div className="main-content">
            <div style={styles.contentGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ color: '#1a237e', marginBottom: '10px' }}>Moji svěřenci a tréninkový plán</h3>

                {clientHorses.length === 0 ? (
                  <div style={styles.emptyState}>
                    Zatím nejste přiřazen k žádnému koni. Počkejte na pozvánku od majitele stáje.
                  </div> 
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
                    {clientHorses.map(horse => {
                      const isD = expandedDiaryId === horse.id;
                      const horseLogs = allDiaryLogs.filter(l => l.horse_id === horse.id);
                      const vacS = getHealthStatus(horse.vaccination_date);

                      return (
                        <div key={horse.id} style={{ ...styles.horseCard, borderTop: `6px solid ${getHorseColor(horse.id)}` }}>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <img src={horse.photo_url || 'https://via.placeholder.com/60?text=JEZDEC'} style={styles.horseImage} />
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: '1.25rem' }}>{horse.name}</h4>
                              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '3px' }}>
                                Očkování: <span style={{ color: vacS.color, fontWeight: 'bold' }}>{horse.vaccination_date ? new Date(horse.vaccination_date).toLocaleDateString() : 'Nenastaveno'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => toggleDiary(horse.id)} 
                            style={{ ...styles.btnOutline, width: '100%', marginTop: '15px', background: isD ? '#e8eaf6' : 'transparent', borderColor: '#3f51b5', color: '#3f51b5' }}
                          >
                            {isD ? '📖 Zavřít deník práce' : '➕ Zapsat dnešní práci'}
                          </button>

                          {isD && (
                            <div style={{ marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px', border: '1px solid #c5cae9' }}>
                              
                              <h5 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>Záznam tréninku</h5>
                              <form onSubmit={(e) => submitLog(e, horse.club_id)} style={{ display:'grid', gap:'10px', gridTemplateColumns:'1fr 1fr', marginBottom:'20px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e8eaf6' }}>
                                <div>
                                  <label style={styles.formLabel}>Datum:</label>
                                  <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} required />
                                </div>
                                <div>
                                  <label style={styles.formLabel}>Typ práce:</label>
                                  <select 
                                    value={newLog.type} 
                                    onChange={e=>setNewLog({...newLog, type:e.target.value})} 
                                    style={{ ...styles.inputSmall, background: getTypeColor(newLog.type), color: '#fff' }}
                                  >
                                    <option value="Jízdárna">Jízdárna</option>
                                    <option value="Skoky">Skoky</option>
                                    <option value="Terén">Terén</option>
                                    <option value="Lonž">Lonž / Práce ze země</option>
                                    <option value="Závody">Závody</option>
                                    <option value="Odpočinek">Odpočinek / Procházka</option>
                                  </select>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                  <label style={styles.formLabel}>Pocit z tréninku:</label>
                                  <select value={newLog.rating} onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}>
                                    <option value="0">Bez hodnocení</option>
                                    <option value="5">⭐⭐⭐⭐⭐ (Super!)</option>
                                    <option value="4">⭐⭐⭐⭐ (Dobré)</option>
                                    <option value="3">⭐⭐⭐ (Šlo to)</option>
                                    <option value="2">⭐⭐ (Nic moc)</option>
                                    <option value="1">⭐ (Tragedie)</option>
                                  </select>
                                </div>
                                
                                <div style={{ gridColumn:'span 2' }}>
                                  <label style={styles.formLabel}>Poznámky k práci (Co se dařilo/nedařilo):</label>
                                  <textarea placeholder="Popis tréninku pro majitele/trenéra..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{ ...styles.inputSmall, height: '70px' }} required />
                                </div>

                                <div style={{ gridColumn:'span 2' }}>
                                  <label style={styles.formLabel}>Fotka / Video z tréninku (Nepovinné):</label>
                                  <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{ ...styles.inputSmall, background: '#fff' }} />
                                </div>
                                
                                <button type="submit" style={{ gridColumn:'span 2', background:'#3f51b5', color:'#fff', border:'none', padding:'12px', borderRadius:'6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  Uložit záznam do deníku
                                </button>
                              </form>

                              <h4 style={{ margin: '10px 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px', fontSize: '0.9rem', color: '#1a237e' }}>Historie tréninků</h4>
                              {horseLogs.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: '#999' }}>Zatím žádné záznamy.</p>
                              ) : (
                                horseLogs.slice(0, 10).map(log => (
                                  <div key={log.id} style={{ fontSize:'0.8rem', padding:'10px', borderLeft:`4px solid ${getTypeColor(log.training_type)}`, background: '#fff', marginBottom: '8px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <strong>{new Date(log.date).toLocaleDateString('cs-CZ')} - {log.training_type}</strong>
                                    </div>
                                    {log.rating > 0 && <div style={{ marginTop: '2px', fontSize: '0.9rem' }}>{'⭐'.repeat(log.rating)}</div>}
                                    <div style={{ color:'#444', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{log.notes}</div>
                                    {log.attachment_url && <a href={log.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color:'#3f51b5', fontWeight: 'bold', textDecoration: 'none', display: 'block', marginTop: '6px' }}>📎 Zobrazit přílohu</a>}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mobileStyles = `
  @media (max-width: 768px) {
    .sidebar { 
      position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; z-index: 1000; 
      transition: left 0.3s ease; background: white; box-shadow: 2px 0 10px rgba(0,0,0,0.2); overflow-y: auto; 
    }
    .sidebar.open { left: 0; }
    .sidebar-overlay { 
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 999; 
    }
    .main-layout { display: flex !important; flex-direction: column; width: 100% !important; }
    .main-content { width: 100% !important; overflow-x: hidden; }
  }
`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#3f51b5' },
  topNav: { display: 'flex', background: '#1a237e', padding: '15px 20px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  hamburgerBtn: { background: '#3f51b5', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' },
  btnNavOutline: { background: 'transparent', border: '1px solid #c5cae9', color: '#c5cae9', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  sideCard: { background: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #3f51b5' },
  horseCard: { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  horseImage: { width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e8eaf6' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' },
  formLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '3px' },
  tabBtn: { background: 'transparent', border: 'none', flex: 1, padding: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnPrimary: { color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', width: '100%', fontWeight: 'bold' },
  btnOutline: { background: 'transparent', border: '1px solid #ccc', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  btnText: { background: 'none', border: 'none', textDecoration: 'underline', marginTop: '15px', cursor: 'pointer', width: '100%' },
  emptyState: { textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '12px', color: '#888', border: '1px dashed #ccc' },
  btnCalNavSmall: { background: '#eee', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }
};
