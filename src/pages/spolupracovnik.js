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

const HORSE_COLORS = ['#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

export default function PortalSpolupracovnik() {
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
  const [sidebarTab, setSidebarTab] = useState('staj'); 
  
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Krmení', 
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
          // KONTROLA ROLE SPOLUPRACOVNÍKA (Grooma)
          const isGroom = memberships.some(m => m.role === 'collaborator');
          
          if (!isGroom) {
            window.location.href = '/kone'; 
            return;
          }
          
          const groomMemberships = memberships.filter(m => m.role === 'collaborator');
          setMyMemberships(groomMemberships);
          
          const clubIds = groomMemberships.map(m => m.club_id);
          
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
      full_name: profile.full_name
    }).eq('id', user.id);
    
    setIsProfileEditing(false);
    alert('Údaje uloženy.');
  };

  const getHorseColor = (horseId) => {
    return HORSE_COLORS[clientHorses.findIndex(h => h.id === horseId) % HORSE_COLORS.length] || '#333';
  };

  const getTypeColor = (type) => { 
    const colors = { 
      'Krmení': '#009688', 
      'Místování': '#795548', 
      'Čištění': '#03a9f4', 
      'Výběh': '#4caf50', 
      'Dekování': '#673ab7',
      'Péče': '#e91e63'
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
        type: 'Krmení', 
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
      const fName = `care_${Math.random()}.${fExt}`;
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
      alert('Péče byla úspěšně zapsána do deníku!'); 
      const horseIds = clientHorses.map(h => h.id);
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
      setAllDiaryLogs(logs || []);
      
      setNewLog({ 
        date: new Date().toISOString().split('T')[0], 
        type: 'Krmení', 
        notes: '', 
        rating: 0 
      }); 
      setDocFile(null); 
    }
  };

  if (loading) {
    return (
      <div style={styles.loader}>
        Načítám portál péče (Groom)...
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
        <title>Portál Ošetřovatele | Jezdecké Impérium</title>
      </Head>
      <style>{mobileStyles}</style>

      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>
              ☰ Groom
            </button>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>
              🧹 Portál Ošetřovatele (SP)
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
        <div style={{ ...styles.card, maxWidth: '400px', margin: '60px auto', borderTop: '5px solid #009688' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {inviteToken ? (
              <div style={{ background: '#e0f2f1', padding: '15px', borderRadius: '8px', border: '2px solid #009688' }}>
                <h3 style={{ color: '#009688', margin: '0 0 5px 0' }}>Byl jste pozván do týmu!</h3>
                <p style={{ margin: 0, color: '#333' }}>Přihlaste se pro přístup k péči o koně.</p>
              </div>
            ) : (
              <>
                <h1 style={{ color: '#009688', margin: '0 0 10px 0' }}>Vstup pro ošetřovatele</h1>
                <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Vstupte do své směny.</p>
              </>
            )}
          </div>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="email" 
              placeholder="E-mail" 
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
            <button type="submit" style={{...styles.btnPrimary, background: '#009688'}}>
              {isSignUp ? 'ZAREGISTROVAT A PŘIJMOUT' : 'PŘIHLÁSIT DO SMĚNY'}
            </button>
          </form>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{...styles.btnText, color: '#009688'}}
          >
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se.'}
          </button>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee' }}>
              <button 
                onClick={() => setSidebarTab('staj')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'staj' ? '3px solid #009688' : 'none', color: sidebarTab === 'staj' ? '#009688' : '#888' }}
              >
                🐴 Seznam Koní
              </button>
              <button 
                onClick={() => setSidebarTab('profil')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #009688' : 'none', color: sidebarTab === 'profil' ? '#009688' : '#888' }}
              >
                👤 Můj Profil
              </button>
            </div>

            {sidebarTab === 'profil' && (
              <div>
                <h4 style={{ margin: '0 0 15px 0', color: '#009688' }}>Můj profil</h4>
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
                    <button type="submit" style={{ ...styles.btnPrimary, background: '#4caf50' }}>Uložit</button>
                    <button type="button" onClick={() => setIsProfileEditing(false)} style={styles.btnOutline}>Zrušit</button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name || 'Groom'}</strong></p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Role: Spolupracovník stáje</p>
                    <button onClick={() => setIsProfileEditing(true)} style={{ ...styles.btnOutline, width: '100%', marginTop: '10px' }}>
                      Upravit profil
                    </button>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'staj' && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#009688' }}>Moje působiště</h4>
                {horsesByClub.map((club, idx) => (
                  <div key={idx} style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #009688' }}>
                    <strong>🏢 {club.clubName}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '3px' }}>
                      K dispozici: {club.horses.length} koní
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
                
                {horsesByClub.map(club => (
                  <div key={club.clubId}>
                    <h3 style={{ color: '#004d40', marginBottom: '15px' }}>🏢 Stáj: {club.clubName}</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '15px' }}>
                      {club.horses.map(horse => {
                        const isD = expandedDiaryId === horse.id;
                        const horseLogs = allDiaryLogs.filter(l => l.horse_id === horse.id);

                        return (
                          <div key={horse.id} style={{ ...styles.horseCard, borderLeft: `6px solid ${getHorseColor(horse.id)}` }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                              <img src={horse.photo_url || 'https://via.placeholder.com/60?text=KŮŇ'} style={styles.horseImage} />
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0 }}>{horse.name}</h4>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                  Věk: {horse.birth_year ? (new Date().getFullYear() - horse.birth_year) : '?'} let
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ marginTop: '10px', padding: '8px', background: '#fcfcfc', borderRadius: '6px', border: '1px solid #eee', fontSize: '0.85rem' }}>
                              <strong>📝 Poznámky k péči / Dietě:</strong><br/>
                              <span style={{ color: '#555' }}>{horse.diet_notes || 'Žádné speciální pokyny.'}</span>
                            </div>

                            <button 
                              onClick={() => toggleDiary(horse.id)} 
                              style={{ ...styles.btnOutline, width: '100%', marginTop: '12px', background: isD ? '#e0f2f1' : 'transparent', borderColor: '#009688', color: '#009688' }}
                            >
                              {isD ? '📖 Zavřít hlášení' : '➕ Zapsat dnešní péči'}
                            </button>

                            {isD && (
                              <div style={{ marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px', border: '1px solid #ddd' }}>
                                
                                <h5 style={{ margin: '0 0 10px 0', color: '#00796b' }}>Nové hlášení péče</h5>
                                <form onSubmit={(e) => submitLog(e, club.clubId)} style={{ display:'grid', gap:'10px', gridTemplateColumns:'1fr 1fr', marginBottom:'20px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #b2dfdb' }}>
                                  <div>
                                    <label style={styles.formLabel}>Datum:</label>
                                    <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} required />
                                  </div>
                                  <div>
                                    <label style={styles.formLabel}>Typ úkonu:</label>
                                    <select 
                                      value={newLog.type} 
                                      onChange={e=>setNewLog({...newLog, type:e.target.value})} 
                                      style={{ ...styles.inputSmall, background: getTypeColor(newLog.type), color: '#fff' }}
                                    >
                                      <option value="Krmení">Krmení / Voda</option>
                                      <option value="Místování">Místování / Podestýlka</option>
                                      <option value="Čištění">Čištění / Sedlání</option>
                                      <option value="Výběh">Vodění do výběhu</option>
                                      <option value="Dekování">Dekování</option>
                                      <option value="Péče">Ostatní péče / Medikace</option>
                                    </select>
                                  </div>
                                  
                                  <div style={{ gridColumn:'span 2' }}>
                                    <label style={styles.formLabel}>Zpráva pro majitele:</label>
                                    <textarea placeholder="Vše v pořádku, sežral všechno..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{ ...styles.inputSmall, height: '60px' }} required />
                                  </div>

                                  <div style={{ gridColumn:'span 2' }}>
                                    <label style={styles.formLabel}>Fotka z boxu / výběhu (Nepovinné):</label>
                                    <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{ ...styles.inputSmall, background: '#fff' }} />
                                  </div>
                                  
                                  <button type="submit" style={{ gridColumn:'span 2', background:'#009688', color:'#fff', border:'none', padding:'12px', borderRadius:'6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Odeslat do deníku
                                  </button>
                                </form>

                                <h4 style={{ margin: '10px 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Poslední záznamy péče</h4>
                                {horseLogs.length === 0 ? (
                                  <p style={{ fontSize: '0.8rem', color: '#999' }}>Dnes zatím žádná aktivita.</p>
                                ) : (
                                  horseLogs.slice(0, 5).map(log => (
                                    <div key={log.id} style={{ fontSize:'0.8rem', padding:'8px', borderLeft:`3px solid ${getTypeColor(log.training_type)}`, background: '#fff', marginBottom: '8px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                      <strong>{new Date(log.date).toLocaleDateString('cs-CZ')} - {log.training_type}</strong>
                                      <div style={{ color:'#444', marginTop: '2px' }}>{log.notes}</div>
                                      {log.attachment_url && <a href={log.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color:'#009688', fontWeight: 'bold', textDecoration: 'none', display: 'block', marginTop: '4px' }}>📎 Zobrazit přílohu</a>}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
                }

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
    .sidebar { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; z-index: 1000; transition: left 0.3s ease; background: white; box-shadow: 2px 0 10px rgba(0,0,0,0.2); overflow-y: auto; }
    .sidebar.open { left: 0; }
    .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 999; }
    .main-layout { display: flex !important; flex-direction: column; width: 100% !important; }
    .main-content { width: 100% !important; overflow-x: hidden; }
  }
`;

const styles = {
  container: { backgroundColor: '#e0f2f1', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#009688' },
  topNav: { display: 'flex', background: '#004d40', padding: '15px 20px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  hamburgerBtn: { background: '#009688', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' },
  btnNavOutline: { background: 'transparent', border: '1px solid #80cbc4', color: '#80cbc4', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  sideCard: { background: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #009688' },
  horseCard: { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  horseImage: { width: '55px', height: '55px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #b2dfdb' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' },
  formLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '3px' },
  tabBtn: { background: 'transparent', border: 'none', flex: 1, padding: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnPrimary: { color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', width: '100%', fontWeight: 'bold' },
  btnOutline: { background: 'transparent', border: '1px solid #ccc', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  btnText: { background: 'none', border: 'none', textDecoration: 'underline', marginTop: '15px', cursor: 'pointer', width: '100%' },
  emptyState: { textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '12px', color: '#888', border: '1px dashed #ccc' }
};
