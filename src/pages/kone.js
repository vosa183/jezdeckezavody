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
  
  if (diffDays < 0) {
    return { text: `(Propadlé o ${Math.abs(diffDays)} dní!)`, color: '#d32f2f', bgColor: '#ffebee' };
  }
  if (diffDays <= 14) {
    return { text: `(Zbývá ${diffDays} dní)`, color: '#e65100', bgColor: '#fff8e1' };
  }
  return { text: `(V pořádku, zbývá ${diffDays} dní)`, color: '#2e7d32', bgColor: '#e8f5e9' };
};

const createGCalLink = (title, dateString) => {
  if (!dateString) return '#';
  
  const date = new Date(dateString);
  const formattedDate = date.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 8);
  
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const formattedNextDate = nextDay.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 8);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formattedDate}/${formattedNextDate}`;
};

const HORSE_COLORS = ['#0288d1', '#388e3c', '#d32f2f', '#f57f17', '#8e24aa', '#5d4037', '#00796b', '#c2185b'];

export default function StajoveImperium() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myClub, setMyClub] = useState(null);
  const [userRole, setUserRole] = useState('trainer'); 
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  const [myHorses, setMyHorses] = useState([]);
  const [isEditingHorse, setIsEditingHorse] = useState(false);
  const [currentHorseId, setCurrentHorseId] = useState(null);
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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('profil'); 

  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [allDiaryLogs, setAllDiaryLogs] = useState([]); 
  const [allPayments, setAllPayments] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Jízdárna', 
    notes: '', 
    cost: 0, 
    rating: 0 
  });
  
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarDetailDate, setCalendarDetailDate] = useState(null);

  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteNewEmail, setInviteNewEmail] = useState('');
  const [inviteNewRole, setInviteNewRole] = useState('trainer');

  const [adminView, setAdminView] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [licenseKeyInput, setLicenseKeyInput] = useState(''); 
  const [editingClubDates, setEditingClubDates] = useState({});
  const [adminGenEmail, setAdminGenEmail] = useState('');
  const [adminGenDuration, setAdminGenDuration] = useState('12');

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
        // --- DOPRAVNÍ POLICISTA ---
        const { data: mData } = await supabase.from('club_members').select('role').eq('user_id', authUser.id).limit(1);
        
        if (mData && mData.length > 0) {
          if (mData[0].role === 'vet' || mData[0].role === 'farrier') {
            window.location.href = '/pece';
            return;
          }
        }
        
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        if (prof?.club_id) {
          const { data: clubData } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single();
          setMyClub(clubData);
          
          const { data: myMemberRec } = await supabase.from('club_members').select('role').eq('club_id', prof.club_id).eq('user_id', authUser.id).single();
          
          if (myMemberRec) {
            setUserRole(myMemberRec.role);
          } else if (prof.club_id === '00000000-0000-0000-0000-000000000000') {
            setUserRole('owner');
          }
          
          await fetchMyHorses(prof.club_id, authUser.id);
          await fetchTeam(prof.club_id);
          await fetchPayments(prof.club_id);
        } else {
          setUserRole('owner');
          await fetchMyHorses(null, authUser.id);
        }
        
        if (prof?.role === 'superadmin') {
          await fetchClubs();
        }
      }
    } finally { 
      setLoading(false); 
    }
  }

  async function fetchPayments(clubId) {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles:professional_id(full_name, bank_account)')
      .eq('club_id', clubId)
      .eq('is_paid', false);
      
    setAllPayments(data || []);
  }

  async function fetchTeam(clubId) {
    if (!clubId) return setTeamMembers([]);
    
    const { data } = await supabase
      .from('club_members')
      .select('*, profiles(full_name, email)')
      .eq('club_id', clubId);
      
    setTeamMembers(data || []);
  }

  async function fetchClubs() {
    const { data: clubsData } = await supabase.from('clubs').select('*').order('created_at', { ascending: false });
    const { data: ownersData } = await supabase.from('club_members').select('club_id, profiles(email)').eq('role', 'owner');
    
    if (clubsData && ownersData) {
      const merged = clubsData.map(c => {
        const owner = ownersData.find(o => o.club_id === c.id);
        return { 
          ...c, 
          owner_email: owner?.profiles?.email || 'Neznámý' 
        };
      });
      setClubs(merged);
    } else {
      setClubs(clubsData || []);
    }
  }

  async function fetchMyHorses(clubId, userId) {
    if (!userId) return setMyHorses([]);
    
    let query = supabase.from('horses').select('*').order('created_at', { ascending: false });
    
    if (!clubId || clubId === '00000000-0000-0000-0000-000000000000') {
      query = query.eq('owner_id', userId);
    } else {
      query = query.eq('club_id', clubId);
    }
    
    const { data: horses } = await query;
    setMyHorses(horses || []);
    
    if (horses && horses.length > 0) {
      const horseIds = horses.map(h => h.id);
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
      setAllDiaryLogs(logs || []);
    } else {
      setAllDiaryLogs([]);
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
        let targetClubId = null; 
        let role = 'owner';
        
        if (inviteToken) {
          const { data: invData } = await supabase.from('invitations').select('*').eq('token', inviteToken).single();
          
          if (invData && !invData.is_accepted) { 
            targetClubId = invData.club_id; 
            role = invData.role; 
            await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id); 
          }
        } 
        
        if (!targetClubId) {
          const trialEnd = new Date(); 
          trialEnd.setDate(trialEnd.getDate() + 14);
          
          const { data: newClub } = await supabase.from('clubs').insert([{ 
            name: 'Moje Stáj', 
            is_active: true, 
            trial_ends_at: trialEnd.toISOString() 
          }]).select().single();
          
          if (newClub) targetClubId = newClub.id;
        }
        
        if (targetClubId) {
          await supabase.from('club_members').insert([{ 
            club_id: targetClubId, 
            user_id: data.user.id, 
            role: role 
          }]);
          await supabase.from('profiles').insert([{ 
            id: data.user.id, 
            email: email, 
            license_type: 'Hobby', 
            club_id: targetClubId 
          }]);
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

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!profile?.club_id) return alert('Klub nebyl nalezen.');
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { error } = await supabase.from('invitations').insert([{ 
      club_id: profile.club_id, 
      email: inviteNewEmail, 
      role: inviteNewRole, 
      token: token 
    }]);
    
    if (error) {
      alert('Chyba: ' + error.message);
    } else {
      const path = (inviteNewRole === 'vet' || inviteNewRole === 'farrier') ? '/pece' : '/kone';
      const link = `${window.location.origin}${path}?invite=${token}`;
      
      navigator.clipboard.writeText(link).then(() => { 
        alert(`Pozvánka zkopírována:\n${link}`); 
        setInviteNewEmail(''); 
      });
    }
  };

  const handleUpdateClubLicense = async (clubId, clubName) => {
    const newDate = editingClubDates[clubId]; 
    if (!newDate) return alert('Zadejte datum.');
    
    if (confirm(`Změnit licenci ${clubName} na ${new Date(newDate).toLocaleDateString()}?`)) {
      await supabase.from('clubs').update({ license_valid_until: newDate }).eq('id', clubId); 
      alert('Aktualizováno!'); 
      fetchClubs(); 
    }
  };

  const handleClubDateChange = (clubId, dateValue) => {
    setEditingClubDates(prev => ({ ...prev, [clubId]: dateValue }));
  };
  
  const getHorseColor = (horseId) => {
    return HORSE_COLORS[myHorses.findIndex(h => h.id === horseId) % HORSE_COLORS.length] || '#333';
  };
  
  const getTypeColor = (type) => { 
    const colors = { 
      'Jízdárna': '#1976d2', 
      'Lonž': '#8e24aa', 
      'Terén': '#388e3c', 
      'Skoky': '#f57f17', 
      'Odpočinek': '#9e9e9e', 
      'Veterinář': '#00838f', 
      'Zuby': '#00838f', 
      'Fyzio': '#00838f', 
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
        cost: 0, 
        rating: 0 
      }); 
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
    
    const { error } = await supabase.from('horse_diary').insert([{ 
      horse_id: horseId, 
      club_id: profile?.club_id, 
      date: newLog.date, 
      training_type: newLog.type, 
      notes: newLog.notes, 
      cost: newLog.cost, 
      rating: newLog.rating, 
      attachment_url: attUrl 
    }]);
    
    if (error) {
      alert(error.message);
    } else { 
      const horseIds = myHorses.map(h => h.id); 
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds); 
      
      setAllDiaryLogs(logs || []); 
      setNewLog({ date: newLog.date, type: 'Jízdárna', notes: '', cost: 0, rating: 0 }); 
      setDocFile(null); 
    }
  };

  const deleteDiaryLog = async (logId) => { 
    if(confirm('Smazat záznam?')) { 
      await supabase.from('horse_diary').delete().eq('id', logId); 
      const horseIds = myHorses.map(h => h.id); 
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds); 
      setAllDiaryLogs(logs || []); 
    } 
  };
  
  const updateProfile = async (e) => { 
    e.preventDefault(); 
    
    await supabase.from('profiles').update({ 
      full_name: profile.full_name, 
      stable: profile.stable 
    }).eq('id', user.id); 
    
    if (userRole === 'owner' && profile.stable && myClub) { 
      await supabase.from('clubs').update({ name: profile.stable }).eq('id', myClub.id); 
      setMyClub({...myClub, name: profile.stable}); 
    } 
    
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
      owner_id: user.id, 
      club_id: profile?.club_id, 
      name: horseData.name, 
      birth_year: horseData.birth_year, 
      horse_id_number: horseData.horse_id_number, 
      vaccination_date: horseData.vaccination_date || null, 
      farrier_date: horseData.farrier_date || null, 
      diet_notes: horseData.diet_notes, 
      photo_url: finalPhotoUrl 
    };
    
    if (currentHorseId) {
      await supabase.from('horses').update(payload).eq('id', currentHorseId); 
    } else {
      await supabase.from('horses').insert([payload]);
    }
    
    resetHorseForm(); 
    fetchMyHorses(profile?.club_id, user.id);
  };

  const editHorse = (h) => { 
    setHorseData({ 
      ...h, 
      vaccination_date: h.vaccination_date || '', 
      farrier_date: h.farrier_date || '' 
    }); 
    setCurrentHorseId(h.id); 
    setIsEditingHorse(true); 
  };
  
  const changeMonth = (offset) => { 
    const newDate = new Date(calendarMonth); 
    newDate.setMonth(newDate.getMonth() + offset); 
    setCalendarMonth(newDate); 
  };

  const getQRLink = (acc, amount, msg) => {
    if (!acc) return null;
    return `https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=${acc.split('/')[0]}&bankCode=${acc.split('/')[1]}&amount=${amount}&currency=CZK&message=${encodeURIComponent(msg)}`;
  };

  const markAsPaid = async (payId) => {
    if (confirm('Označit jako zaplacené?')) {
      await supabase.from('payments').update({ is_paid: true, paid_at: new Date() }).eq('id', payId);
      fetchPayments(profile.club_id);
    }
  };

  const resetHorseForm = () => { 
    setHorseData({ 
      name: '', 
      birth_year: '', 
      horse_id_number: '', 
      vaccination_date: '', 
      farrier_date: '', 
      diet_notes: '', 
      photo_url: '' 
    }); 
    setPhotoFile(null); 
    setCurrentHorseId(null); 
    setIsEditingHorse(false); 
  };

  if (loading) return <div style={styles.loader}>Načítám...</div>;

  return (
    <div style={styles.container}>
      <style>{mobileStyles}</style>
      
      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>
              ☰ Stáj
            </button>
            <h2 style={{ margin: 0, color: '#fff' }}>🐴 Moje Stáj</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {profile?.role === 'superadmin' && (
              <button 
                onClick={() => setAdminView(!adminView)} 
                style={{ ...styles.btnNavOutline, background: adminView ? '#fff' : 'transparent', color: adminView ? '#333' : '#ffb300' }}
              >
                {adminView ? '🐴 Zpět' : '🏢 Superadmin'}
              </button>
            )}
          </div>
        </div>
      )}

      {!user ? (
        <div style={{ ...styles.card, maxWidth: '400px', margin: '40px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {inviteToken ? (
              <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '2px solid #4caf50' }}>
                <h3 style={{ color: '#2e7d32', margin: '0 0 5px 0' }}>Vítejte v týmu!</h3>
                <p style={{ margin: 0, color: '#333' }}>Přihlaste se nebo se zaregistrujte.</p>
              </div>
            ) : (
              <>
                <h1 style={{ color: '#5d4037', margin: '0 0 10px 0' }}>Jezdecké Impérium</h1>
                <p style={{ color: '#888' }}>Vstup do správy koní.</p>
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
            <button type="submit" style={styles.btnPrimary}>
              {isSignUp ? 'ZAREGISTROVAT SE' : 'PŘIHLÁSIT SE'}
            </button>
          </form>
          
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
            {isSignUp ? 'Máte účet? Přihlaste se.' : 'Nemáte účet? Registrace.'}
          </button>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee' }}>
              <button 
                onClick={() => setSidebarTab('profil')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #5d4037' : 'none' }}
              >
                👤 Profil
              </button>
              <button 
                onClick={() => setSidebarTab('tym')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'tym' ? '3px solid #5d4037' : 'none' }}
              >
                👥 Tým
              </button>
              <button 
                onClick={() => setSidebarTab('platby')} 
                style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'platby' ? '3px solid #5d4037' : 'none' }}
              >
                💰 Platby
              </button>
            </div>

            {sidebarTab === 'profil' && (
              <>
                {editMode ? (
                  <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={styles.formLabel}>Jméno</label>
                    <input 
                      style={styles.inputSmall} 
                      value={profile?.full_name || ''} 
                      onChange={e => setProfile({...profile, full_name: e.target.value})} 
                    />
                    
                    {userRole === 'owner' && (
                      <>
                        <label style={styles.formLabel}>Stáj</label>
                        <input 
                          style={styles.inputSmall} 
                          value={profile?.stable || ''} 
                          onChange={e => setProfile({...profile, stable: e.target.value})} 
                        />
                      </>
                    )}
                    
                    <button type="submit" style={styles.btnSave}>Uložit</button>
                    <button type="button" onClick={() => setEditMode(false)} style={{ ...styles.btnSave, background: '#ccc' }}>
                      Zrušit
                    </button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name}</strong></p>
                    <p style={{ fontSize:'0.8rem' }}>{myClub?.name || 'Bez stáje'}</p>
                    
                    <button onClick={() => setEditMode(true)} style={styles.btnOutline}>
                      Upravit
                    </button>
                    <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={styles.btnSignOut}>
                      Odhlásit
                    </button>
                  </div>
                )}
              </>
            )}

            {sidebarTab === 'tym' && (
              <div>
                {userRole === 'owner' && (
                  <>
                    <h4 style={{ margin: '10px 0' }}>Přidat do týmu</h4>
                    <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafafa', padding: '10px', borderRadius: '8px' }}>
                      <input 
                        type="email" 
                        placeholder="E-mail" 
                        value={inviteNewEmail} 
                        onChange={e => setInviteNewEmail(e.target.value)} 
                        style={styles.inputSmall} 
                        required 
                      />
                      <select 
                        value={inviteNewRole} 
                        onChange={e => setInviteNewRole(e.target.value)} 
                        style={styles.inputSmall}
                      >
                        <option value="owner">HO - Hospodář</option>
                        <option value="collaborator">SP - Spolupracovník</option>
                        <option value="trainer">TR - Trenér</option>
                        <option value="farrier">KO - Kovář</option>
                        <option value="vet">VE - Veterinář</option>
                      </select>
                      <button type="submit" style={{ ...styles.btnSave, background: '#4caf50' }}>
                        Poslat pozvánku
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {sidebarTab === 'platby' && (
              <div>
                <h4 style={{ margin: '10px 0' }}>K proplacení</h4>
                {allPayments.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#888' }}>Žádné platby.</p>
                ) : (
                  allPayments.map(p => (
                    <div key={p.id} style={{ background: '#fff3e0', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ffe0b2' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong>{p.amount} Kč</strong> - {p.profiles?.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        {p.description}
                      </div>
                      
                      {p.profiles?.bank_account && (
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                          <img 
                            src={getQRLink(p.profiles.bank_account, p.amount, p.description)} 
                            style={{ width: '100%', maxWidth: '150px' }} 
                            alt="QR Platba"
                          />
                          <div style={{ fontSize: '0.7rem', color: '#888' }}>Naskenujte v bance</div>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => markAsPaid(p.id)} 
                        style={{ ...styles.btnSave, marginTop: '10px', fontSize: '0.75rem' }}
                      >
                        Mám zaplaceno
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="main-content">
            <div style={styles.contentGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#3e2723' }}>Koně stáje {myClub?.name}</h3>
                  {(userRole === 'owner' || userRole === 'collaborator') && (
                    <button 
                      onClick={() => { setIsEditingHorse(true); setCurrentHorseId(null); }} 
                      style={styles.btnAdd}
                    >
                      + Nový kůň
                    </button>
                  )}
                </div>
                
                {myHorses.map(h => {
                  const isD = expandedDiaryId === h.id;
                  const logs = allDiaryLogs.filter(l => l.horse_id === h.id);
                  
                  return (
                    <div key={h.id} style={{ ...styles.horseCard, borderLeft: `6px solid ${getHorseColor(h.id)}` }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <img 
                          src={h.photo_url || 'https://via.placeholder.com/60'} 
                          style={{ width:'60px', height:'60px', borderRadius:'50%', objectFit:'cover' }} 
                          alt="Profil"
                        />
                        <div style={{ flex:1 }}>
                          <h4 style={{ margin:0 }}>{h.name}</h4>
                          <small>{h.birth_year}</small>
                        </div>
                        <button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button>
                      </div>
                      
                      <button 
                        onClick={() => toggleDiary(h.id)} 
                        style={{ ...styles.btnOutline, marginTop: '10px' }}
                      >
                        {isD ? 'Zavřít deník' : 'Otevřít deník'}
                      </button>
                      
                      {isD && (
                        <div style={{ marginTop: '15px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                          <form onSubmit={(e) => saveDiaryLog(e, h.id)} style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                            <input 
                              type="date" 
                              value={newLog.date} 
                              onChange={e=>setNewLog({...newLog, date:e.target.value})} 
                              style={styles.inputSmall} 
                            />
                            <select 
                              value={newLog.type} 
                              onChange={e=>setNewLog({...newLog, type:e.target.value})} 
                              style={styles.inputSmall}
                            >
                              <option value="Jízdárna">Jízdárna</option>
                              <option value="Lonž">Lonž</option>
                              <option value="Terén">Terén</option>
                            </select>
                            <textarea 
                              placeholder="Poznámka..." 
                              value={newLog.notes} 
                              onChange={e=>setNewLog({...newLog, notes:e.target.value})} 
                              style={styles.inputSmall} 
                            />
                            <button type="submit" style={styles.btnSave}>Uložit</button>
                          </form>
                          
                          {logs.map(log => (
                            <div key={log.id} style={{ fontSize: '0.85rem', padding: '5px 0', borderBottom: '1px solid #eee' }}>
                              <strong>{log.date}</strong>: {log.training_type} - {log.notes}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isEditingHorse && (userRole === 'owner' || userRole === 'collaborator') && (
              <div style={styles.formCard}>
                <h3 style={{ marginTop: 0, color: '#5d4037' }}>
                  {currentHorseId ? 'Upravit kartu koně' : 'Nová karta koně'}
                </h3>
                <form onSubmit={handleSaveHorse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
                    <label style={styles.formLabel}>Fotka</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setPhotoFile(e.target.files[0])} 
                      style={{ ...styles.inputSmall, background: '#fff' }} 
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Jméno *</label>
                    <input 
                      value={horseData.name} 
                      onChange={e=>setHorseData({...horseData, name:e.target.value})} 
                      style={styles.input} 
                      required 
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.formLabel}>Rok</label>
                      <input 
                        type="number" 
                        value={horseData.birth_year} 
                        onChange={e=>setHorseData({...horseData, birth_year:e.target.value})} 
                        style={styles.input} 
                      />
                    </div>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.formLabel}>ID</label>
                      <input 
                        value={horseData.horse_id_number} 
                        onChange={e=>setHorseData({...horseData, horse_id_number:e.target.value})} 
                        style={styles.input} 
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.formLabel}>Očkování:</label>
                      <input 
                        type="date" 
                        value={horseData.vaccination_date} 
                        onChange={e=>setHorseData({...horseData, vaccination_date:e.target.value})} 
                        style={styles.input} 
                      />
                    </div>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.formLabel}>Kovář:</label>
                      <input 
                        type="date" 
                        value={horseData.farrier_date} 
                        onChange={e=>setHorseData({...horseData, farrier_date:e.target.value})} 
                        style={styles.input} 
                      />
                    </div>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Poznámky:</label>
                    <textarea 
                      value={horseData.diet_notes} 
                      onChange={e=>setHorseData({...horseData, diet_notes:e.target.value})} 
                      style={styles.input} 
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ ...styles.btnPrimary, flex: 2 }}>Uložit</button>
                    <button type="button" onClick={resetHorseForm} style={{ ...styles.btnOutline, flex: 1 }}>Zrušit</button>
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
    justifyContent: 'center' 
  },
  topNav: { 
    display: 'flex', 
    background: '#3e2723', 
    padding: '15px', 
    justifyContent: 'space-between' 
  },
  hamburgerBtn: { 
    background: '#ffb300', 
    border: 'none', 
    padding: '8px', 
    borderRadius: '5px' 
  },
  btnNavOutline: { 
    background: 'transparent', 
    border: '1px solid #ffb300', 
    color: '#ffb300', 
    padding: '5px 10px', 
    borderRadius: '5px', 
    cursor: 'pointer' 
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
    borderTop: '5px solid #5d4037' 
  },
  horseCard: { 
    background: '#fff', 
    padding: '15px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
  },
  input: { 
    padding: '10px', 
    borderRadius: '6px', 
    border: '1px solid #ccc', 
    width: '100%' 
  },
  inputSmall: { 
    padding: '8px', 
    borderRadius: '5px', 
    border: '1px solid #eee', 
    width: '100%' 
  },
  formLabel: { 
    fontSize: '0.8rem', 
    fontWeight: 'bold' 
  },
  tabBtn: { 
    background: 'transparent', 
    border: 'none', 
    flex: 1, 
    padding: '10px', 
    cursor: 'pointer', 
    fontWeight: 'bold' 
  },
  btnSave: { 
    background: '#4caf50', 
    color: '#fff', 
    border: 'none', 
    padding: '8px', 
    borderRadius: '5px', 
    width: '100%', 
    cursor: 'pointer' 
  },
  btnAdd: { 
    background: '#4caf50', 
    color: '#fff', 
    border: 'none', 
    padding: '10px 20px', 
    borderRadius: '8px', 
    cursor: 'pointer' 
  },
  btnPrimary: { 
    background: '#5d4037', 
    color: '#fff', 
    border: 'none', 
    padding: '12px', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    width: '100%' 
  },
  btnOutline: { 
    background: 'transparent', 
    border: '1px solid #888', 
    padding: '8px', 
    borderRadius: '6px', 
    width: '100%', 
    cursor: 'pointer' 
  },
  btnIconEdit: { 
    background: '#e3f2fd', 
    border: 'none', 
    padding: '5px', 
    borderRadius: '4px' 
  },
  btnText: { 
    background: 'none', 
    border: 'none', 
    color: '#8d6e63', 
    textDecoration: 'underline', 
    marginTop: '10px', 
    cursor: 'pointer' 
  },
  btnSignOut: { 
    background: '#e57373', 
    color: '#fff', 
    border: 'none', 
    padding: '8px', 
    borderRadius: '6px', 
    width: '100%', 
    marginTop: '10px' 
  }
};
