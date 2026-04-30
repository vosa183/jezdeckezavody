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
  
  if (diffDays < 0) return { text: `(Propadlé o ${Math.abs(diffDays)} dní!)`, color: '#d32f2f', bgColor: '#ffebee' };
  if (diffDays <= 14) return { text: `(Zbývá ${diffDays} dní)`, color: '#e65100', bgColor: '#fff8e1' };
  return { text: `(V pořádku, zbývá ${diffDays} dní)`, color: '#2e7d32', bgColor: '#e8f5e9' };
};

const HORSE_COLORS = ['#0288d1', '#388e3c', '#d32f2f', '#f57f17', '#8e24aa', '#5d4037', '#00796b', '#c2185b'];

export default function PortalTrener() {
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
  const [sidebarTab, setSidebarTab] = useState('sverenci'); 
  
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Jízdárna', 
    notes: '', 
    rating: 0
  });

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
          // KONTROLA ROLE TRENÉRA
          const isTrainer = memberships.some(m => m.role === 'trainer');
          
          if (!isTrainer) {
            window.location.href = '/kone'; // Přesměrovat, pokud nemá roli TR
            return;
          }
          
          const trainerMemberships = memberships.filter(m => m.role === 'trainer');
          setMyMemberships(trainerMemberships);
          
          const clubIds = trainerMemberships.map(m => m.club_id);
          
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
              license_type: 'Profi', 
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
        if (inviteToken && data?.user) {
          const { data: invData } = await supabase.from('invitations').select('*').eq('token', inviteToken).single();
          
          if (invData && !invData.is_accepted) {
            const { data: existingMember } = await supabase.from('club_members').select('*').eq('club_id', invData.club_id).eq('user_id', data.user.id).single();
            
            if (!existingMember) {
              await supabase.from('club_members').insert([{ 
                club_id: invData.club_id, 
                user_id: data.user.id, 
                role: invData.role 
              }]);
            }
            await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
          }
        }
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
    alert('Údaje uloženy.');
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
      'Závody': '#e65100'
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
      const fName = `zaznam_${Math.random()}.${fExt}`;
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
      cost: 0, // Trenér nezadává finance
      rating: newLog.rating, 
      attachment_url: attUrl 
    }]);

    if (error) {
      alert(error.message);
    } else { 
      alert('Trénink byl úspěšně zapsán do deníku!'); 
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

  if (loading) {
    return (
      <div style={styles.loader}>
        Načítám trenérský portál...
      </div>
    );
  }

  const horsesByClub = myMemberships.map(membership => ({
    clubName: membership.clubs?.name || 'Neznámá stáj', 
    clubId: membership.club_id, 
    role: membership.role, 
    horses: clientHorses.filter(h => h.club_id === membership.club_id)
  }));

  return (
    <div style={styles.container}>
      <Head>
        <title>Portál Trenéra | Jezdecké Impérium</title>
      </Head>
      <style>{mobileStyles}</style>

      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>
              ☰ Trenér
            </button>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
              ⏱️ Portál Trenéra (TR)
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#e0f2f1', fontSize: '0.9rem' }}>
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
        <div style={{ ...styles.card, maxWidth: '400px', margin: '60px auto', borderTop: '5px solid #1976d2' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {inviteToken ? (
              <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '2px solid #1976d2' }}>
                <h3 style={{ color: '#1976d2', margin: '0 0 5px 0' }}>Byl jste pozván jako trenér!</h3>
                <p style={{ margin: 0, color: '#333' }}>Přihlaste se nebo si založte účet.</p>
              </div>
            ) : (
              <>
                <h1 style={{ color: '#1976d2', margin: '0 0 10px 0' }}>Vstup pro trenéry</h1>
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Přihlaste se ke svým svěřencům.</p>
              </>
            )}
          </div>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="email" 
              placeholder="E-mailová adresa" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={styles.input} 
              required 
              disabled={!!inviteToken && isSignUp} 
            />
            <input 
              type="password" 
              placeholder="Heslo" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={styles.input} 
              required 
            />
            <button type="submit" style={{...styles.btnPrimary, background: '#1976d2'}}>
              {isSignUp ? 'ZAREGISTROVAT A PŘIJMOUT' : 'PŘIHLÁSIT SE'}
            </button>
          </form>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{...styles.btnText, color: '#1976d2'}}
          >
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
          </button>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee' }}>
              <button 
                onClick={() => setSidebarTab('sverenci')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'sverenci' ? '3px solid #1976d2' : 'none', color: sidebarTab === 'sverenci' ? '#1976d2' : '#888' }}
              >
                🐴 Moji Svěřenci
              </button>
              <button 
                onClick={() => setSidebarTab('profil')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #1976d2' : 'none', color: sidebarTab === 'profil' ? '#1976d2' : '#888' }}
              >
                👤 Můj Profil
              </button>
            </div>

            {sidebarTab === 'profil' && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>Nastavení trenéra</h4>
                {isProfileEditing ? (
                  <form onSubmit={updateProfileDetails} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={styles.formLabel}>Jméno a příjmení</label>
                    <input 
                      type="text" 
                      placeholder="Vaše jméno" 
                      value={profile?.full_name || ''} 
                      onChange={e => setProfile({...profile, full_name: e.target.value})} 
                      style={styles.inputSmall} 
                      required 
                    />
                    <label style={styles.formLabel}>Licence</label>
                    <select 
                      style={styles.inputSmall} 
                      value={profile?.license_type || 'Hobby'} 
                      onChange={e => setProfile({...profile, license_type: e.target.value})}
                    >
                      <option value="Hobby">Hobby</option>
                      <option value="ZZVJ">ZZVJ</option>
                      <option value="Profi">Profi trenér</option>
                    </select>
                    <button type="submit" style={{ ...styles.btnPrimary, background: '#4caf50' }}>Uložit údaje</button>
                    <button type="button" onClick={() => setIsProfileEditing(false)} style={{ ...styles.btnOutline }}>Zrušit</button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name || 'Neznámý Trenér'}</strong></p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Licence: {profile?.license_type || 'Nenastaveno'}</p>
                    <button onClick={() => setIsProfileEditing(true)} style={{ ...styles.btnOutline, width: '100%', marginTop: '10px' }}>
                      Upravit profil
                    </button>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'sverenci' && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Seznam stájí</h4>
                {horsesByClub.map((club, idx) => (
                  <div key={idx} style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px' }}>
                    <strong>🏢 {club.clubName}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                      Přiřazeno koní: {club.horses.length}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

          <div className="main-content">
            <div style={styles.contentGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#333' }}>Seznam mých svěřenců v tréninku</h3>
                </div>

                {horsesByClub.length === 0 ? (
                  <div style={styles.emptyState}>
                    Zatím nejste přiřazen jako trenér k žádné stáji.
                  </div> 
                ) : (
                  horsesByClub.map(club => (
                    <div key={club.clubId} style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#1976d2', borderBottom: '2px solid #e3f2fd', paddingBottom: '5px' }}>
                        Stáj: {club.clubName}
                      </h4>
                      
                      {club.horses.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>Ve stáji zatím nejsou evidováni koně.</p>
                      ) : (
                        club.horses.map(horse => {
                          const vacS = getHealthStatus(horse.vaccination_date);
                          const isD = expandedDiaryId === horse.id;
                          const horseLogs = allDiaryLogs.filter(l => l.horse_id === horse.id);

                          return (
                            <div key={horse.id} style={{ ...styles.horseCard, borderLeft: `6px solid ${getHorseColor(horse.id)}`, marginBottom: '15px' }}>
                              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <img 
                                  src={horse.photo_url || 'https://via.placeholder.com/60?text=KŮŇ'} 
                                  style={styles.horseImage} 
                                />
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{horse.name}</h4>
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                                    Ročník: {horse.birth_year || '?'} | 
                                    Zdraví (Očk.): <span style={{ color: vacS.color }}>{horse.vaccination_date ? new Date(horse.vaccination_date).toLocaleDateString() : 'Neznámo'}</span>
                                  </div>
                                </div>
                              </div>

                              <button 
                                onClick={() => toggleDiary(horse.id)} 
                                style={{ ...styles.btnOutline, width: '100%', marginTop: '15px', background: isD ? '#e3f2fd' : 'transparent', borderColor: '#1976d2', color: '#1976d2' }}
                              >
                                {isD ? '📖 Zavřít tréninkový deník' : '📖 Otevřít tréninkový deník'}
                              </button>

                              {isD && (
                                <div style={{ marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px', border: '1px solid #eee' }}>
                                  
                                  <h5 style={{ margin: '0 0 10px 0', color: '#1976d2', fontSize: '1rem' }}>Nový záznam z tréninku ({new Date(newLog.date).toLocaleDateString('cs-CZ')})</h5>
                                  <form onSubmit={(e) => submitLog(e, club.clubId)} style={{ display:'grid', gap:'10px', gridTemplateColumns:'1fr 1fr', marginBottom:'25px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e3f2fd' }}>
                                    <div>
                                      <label style={styles.formLabel}>Datum:</label>
                                      <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} required />
                                    </div>
                                    <div>
                                      <label style={styles.formLabel}>Typ tréninku:</label>
                                      <select 
                                        value={newLog.type} 
                                        onChange={e=>setNewLog({...newLog, type:e.target.value})} 
                                        style={{ ...styles.inputSmall, background: getTypeColor(newLog.type), color: ['Odpočinek'].includes(newLog.type) ? '#000' : '#fff' }}
                                      >
                                        <option value="Jízdárna">Jízdárna (Drezura)</option>
                                        <option value="Skoky">Skoky</option>
                                        <option value="Lonž">Lonž / Práce ze země</option>
                                        <option value="Terén">Kondička (Terén)</option>
                                        <option value="Závody">Závody</option>
                                        <option value="Odpočinek">Odpočinek</option>
                                      </select>
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                      <label style={styles.formLabel}>Hodnocení koně:</label>
                                      <select value={newLog.rating} onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}>
                                        <option value="0">Bez hodnocení</option>
                                        <option value="5">⭐⭐⭐⭐⭐ (Excelentní)</option>
                                        <option value="4">⭐⭐⭐⭐ (Velmi dobré)</option>
                                        <option value="3">⭐⭐⭐ (Průměrné)</option>
                                        <option value="2">⭐⭐ (Slabší)</option>
                                        <option value="1">⭐ (Špatné)</option>
                                      </select>
                                    </div>
                                    
                                    <div style={{ gridColumn:'span 2' }}>
                                      <label style={styles.formLabel}>Tréninkový plán / Zhodnocení:</label>
                                      <textarea placeholder="Jak kůň chodil, na čem jsme pracovali..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{ ...styles.inputSmall, height: '70px' }} required />
                                    </div>

                                    <div style={{ gridColumn:'span 2' }}>
                                      <label style={styles.formLabel}>Připojit video/fotku (Nepovinné, PDF/JPG):</label>
                                      <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{ ...styles.inputSmall, background: '#fff' }} />
                                    </div>
                                    
                                    <button type="submit" style={{ gridColumn:'span 2', background:'#1976d2', color:'#fff', border:'none', padding:'12px', borderRadius:'6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                                      Uložit do deníku
                                    </button>
                                  </form>

                                  <h4 style={{ margin: '15px 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#555' }}>Historie tréninků koně</h4>
                                  {horseLogs.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: '#888' }}>Zatím nejsou evidovány žádné záznamy.</p>
                                  ) : (
                                    horseLogs.map(log => (
                                      <div key={log.id} style={{ fontSize:'0.85rem', padding:'12px', borderLeft:`4px solid ${getTypeColor(log.training_type)}`, background: '#fff', marginBottom: '10px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                          <strong style={{ fontSize: '1rem', color: '#333' }}>{new Date(log.date).toLocaleDateString('cs-CZ')} - {log.training_type}</strong>
                                        </div>
                                        {log.rating > 0 && <div style={{ marginBottom: '5px', fontSize: '1.1rem' }}>{'⭐'.repeat(log.rating)}</div>}
                                        <div style={{ color:'#555', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{log.notes}</div>
                                        {log.attachment_url && (
                                          <div style={{ marginTop: '8px', borderTop: '1px dashed #eee', paddingTop: '8px' }}>
                                            <a href={log.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color:'#1976d2', fontWeight: 'bold', textDecoration: 'none' }}>📎 Přehrát / Otevřít přílohu</a>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ))
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
      position: fixed; 
      top: 0; 
      left: -300px; 
      width: 280px; 
      height: 100vh; 
      z-index: 1000; 
      transition: left 0.3s ease; 
      background: white; 
      box-shadow: 2px 0 10px rgba(0,0,0,0.2); 
    }
    .sidebar.open { 
      left: 0; 
    }
    .main-layout { 
      display: flex !important; 
      flex-direction: column; 
    }
  }
`;

const styles = {
  container: { 
    backgroundColor: '#f4ece4', 
    minHeight: '100vh', 
    fontFamily: 'sans-serif' 
  },
  loader: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#1976d2'
  },
  topNav: { 
    display: 'flex', 
    background: '#0d47a1', 
    padding: '15px 20px', 
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  hamburgerBtn: { 
    background: '#1976d2', 
    color: '#fff',
    border: 'none', 
    padding: '8px 12px', 
    borderRadius: '5px',
    fontWeight: 'bold'
  },
  btnNavOutline: { 
    background: 'transparent', 
    border: '1px solid #bbdefb', 
    color: '#bbdefb', 
    padding: '6px 12px', 
    borderRadius: '5px', 
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  mainGrid: { 
    display: 'grid', 
    gridTemplateColumns: '280px 1fr', 
    gap: '20px', 
    padding: '20px', 
    maxWidth: '1400px', 
    margin: '0 auto' 
  },
  sideCard: { 
    background: '#fff', 
    padding: '20px', 
    borderRadius: '12px', 
    borderTop: '5px solid #1976d2' 
  },
  horseCard: { 
    background: '#fff', 
    padding: '20px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
  },
  horseImage: { 
    width: '60px', 
    height: '60px', 
    borderRadius: '50%', 
    objectFit: 'cover', 
    border: '2px solid #e3f2fd' 
  },
  input: { 
    padding: '12px', 
    borderRadius: '6px', 
    border: '1px solid #ccc', 
    width: '100%',
    boxSizing: 'border-box'
  },
  inputSmall: { 
    padding: '10px', 
    borderRadius: '5px', 
    border: '1px solid #ddd', 
    width: '100%',
    boxSizing: 'border-box'
  },
  formLabel: { 
    fontSize: '0.85rem', 
    fontWeight: 'bold',
    color: '#555',
    display: 'block',
    marginBottom: '5px'
  },
  tabBtn: { 
    background: 'transparent', 
    border: 'none', 
    flex: 1, 
    padding: '10px', 
    cursor: 'pointer', 
    fontWeight: 'bold' 
  },
  btnPrimary: { 
    color: '#fff', 
    border: 'none', 
    padding: '12px', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    width: '100%',
    fontWeight: 'bold'
  },
  btnOutline: { 
    background: 'transparent', 
    border: '1px solid #ccc', 
    padding: '10px', 
    borderRadius: '6px', 
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  btnText: { 
    background: 'none', 
    border: 'none', 
    textDecoration: 'underline', 
    marginTop: '15px', 
    cursor: 'pointer',
    width: '100%'
  },
  emptyState: { 
    textAlign: 'center', 
    padding: '50px', 
    background: '#fff', 
    borderRadius: '12px', 
    color: '#888', 
    border: '1px dashed #ccc' 
  }
};
