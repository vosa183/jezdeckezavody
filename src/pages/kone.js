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
    name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: ''
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('profil'); 

  const [expandedDiaryId, setExpandedDiaryId] = useState(null);
  const [allDiaryLogs, setAllDiaryLogs] = useState([]); 
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
            await supabase.from('club_members').insert([{ club_id: invData.club_id, user_id: authUser.id, role: invData.role }]);
          }
          await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
          alert('Byli jste úspěšně přiřazeni k nové stáji!');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } 
      else if (!authUser && token) {
        setInviteToken(token);
        setIsSignUp(true);
        const { data: invData } = await supabase.from('invitations').select('*').eq('token', token).single();
        if (invData && !invData.is_accepted) {
          setEmail(invData.email);
        }
      }

      if (authUser) {
        // --- DOPRAVNÍ POLICISTA (ROZCESTNÍK) ---
        const { data: memberData } = await supabase.from('club_members').select('role').eq('user_id', authUser.id).limit(1);
        if (memberData && memberData.length > 0) {
          const mainRole = memberData[0].role;
          if (mainRole === 'vet' || mainRole === 'farrier') {
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

  async function fetchTeam(clubId) {
    if (!clubId) return setTeamMembers([]);
    const { data } = await supabase.from('club_members').select('*, profiles(full_name, email)').eq('club_id', clubId);
    setTeamMembers(data || []);
  }

  async function fetchClubs() {
    const { data: clubsData } = await supabase.from('clubs').select('*').order('created_at', { ascending: false });
    const { data: ownersData } = await supabase.from('club_members').select('club_id, profiles(email)').eq('role', 'owner');
    
    if (clubsData && ownersData) {
      const merged = clubsData.map(c => {
        const owner = ownersData.find(o => o.club_id === c.id);
        return { ...c, owner_email: owner?.profiles?.email || 'Neznámý' };
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
          await supabase.from('club_members').insert([{ club_id: targetClubId, user_id: data.user.id, role: role }]);
          await supabase.from('profiles').insert([{ id: data.user.id, email: email, license_type: 'Hobby', club_id: targetClubId }]);
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
              await supabase.from('club_members').insert([{ club_id: invData.club_id, user_id: data.user.id, role: invData.role }]);
            }
            await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
          }
        }
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

  const handleContactSupport = async () => {
    try {
      alert('Odesílám žádost na podporu...');
      await fetch('/api/send-email', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          subject: `Žádost o licenci - ${myClub?.name}`, 
          text: `Uživatel: ${profile?.email}\nStáj: ${myClub?.name}`, 
          emails: ['l.vosika@arastea.cz'] 
        }) 
      });
      alert('Žádost odeslána!');
    } catch (err) { 
      alert('Chyba. Kontaktujte l.vosika@arastea.cz'); 
    }
  };

  const handleApplyLicense = async (e) => {
    e.preventDefault();
    const key = licenseKeyInput.trim(); 
    if (!key) return;
    
    const { data: keyData, error: keyErr } = await supabase.from('license_keys').select('*').eq('key_code', key).single();
    if (keyErr || !keyData) return alert('Klíč neexistuje.');
    if (keyData.is_used) return alert('Klíč je již použit.');
    
    const now = new Date(); 
    const currentValidUntil = myClub.license_valid_until ? new Date(myClub.license_valid_until) : now;
    const startDate = currentValidUntil > now ? currentValidUntil : now;
    startDate.setMonth(startDate.getMonth() + keyData.duration_months);
    
    await supabase.from('clubs').update({ license_valid_until: startDate.toISOString() }).eq('id', myClub.id);
    await supabase.from('license_keys').update({ is_used: true }).eq('id', keyData.id);
    
    alert(`Licence prodloužena do ${startDate.toLocaleDateString('cs-CZ')}.`); 
    setLicenseKeyInput(''); 
    window.location.reload();
  };

  const handleGenerateLicenseKey = async (e) => {
    e.preventDefault();
    const keyCode = `LIC-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const duration = parseInt(adminGenDuration) || 12;
    
    const { error } = await supabase.from('license_keys').insert([{ 
      key_code: keyCode, 
      duration_months: duration, 
      is_used: false 
    }]);
    
    if (error) return alert('Chyba DB: ' + error.message);
    
    try {
      await fetch('/api/send-email', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          subject: 'Licenční klíč', 
          text: `KLÍČ: ${keyCode}`, 
          emails: [adminGenEmail] 
        }) 
      });
      alert(`Klíč ${keyCode} odeslán.`); 
      setAdminGenEmail('');
    } catch (err) { 
      alert(`Klíč: ${keyCode}, ale e-mail selhal.`); 
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

  const deleteHorse = async (id, name) => { 
    if (confirm(`Smazat ${name}?`)) { 
      await supabase.from('horses').delete().eq('id', id); 
      fetchMyHorses(profile?.club_id, user.id); 
    } 
  };

  const resetHorseForm = () => { 
    setHorseData({ name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: '' }); 
    setPhotoFile(null); 
    setCurrentHorseId(null); 
    setIsEditingHorse(false); 
  };

  const updateProfile = async (e) => { 
    e.preventDefault(); 
    await supabase.from('profiles').update({ 
      full_name: profile.full_name, 
      phone: profile.phone, 
      stable: profile.stable, 
      city: profile.city, 
      birth_date: profile.birth_date, 
      license_type: profile.license_type 
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
    setHorseData({ ...h, vaccination_date: h.vaccination_date || '', farrier_date: h.farrier_date || '' }); 
    setCurrentHorseId(h.id); 
    setIsEditingHorse(true); 
  };

  const changeMonth = (offset) => { 
    const newDate = new Date(calendarMonth); 
    newDate.setMonth(newDate.getMonth() + offset); 
    setCalendarMonth(newDate); 
  };

  const renderLicenseStatus = () => {
    if (!myClub) return null; 
    
    const now = new Date(); 
    const trialEnd = myClub.trial_ends_at ? new Date(myClub.trial_ends_at) : null; 
    const licenseEnd = myClub.license_valid_until ? new Date(myClub.license_valid_until) : null;
    
    let statusText = ''; 
    let statusColor = ''; 
    let daysLeft = 0;
    
    if (licenseEnd && licenseEnd > now) { 
      statusText = `Aktivní licence (do ${licenseEnd.toLocaleDateString('cs-CZ')})`; 
      statusColor = '#2e7d32'; 
    } else if (trialEnd && trialEnd > now) { 
      daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)); 
      statusText = `Zkušební verze (zbývá ${daysLeft} dní)`; 
      statusColor = '#f57f17'; 
    } else { 
      statusText = 'Licence vypršela'; 
      statusColor = '#d32f2f'; 
    }
    
    return (
      <div style={{ background: '#fafafa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#5d4037' }}>Stav předplatného</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColor }}></div>
          <strong style={{ color: statusColor }}>{statusText}</strong>
        </div>
        <form onSubmit={handleApplyLicense} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Licenční klíč..." 
            value={licenseKeyInput} 
            onChange={e => setLicenseKeyInput(e.target.value)} 
            style={styles.inputSmall} 
            required 
          />
          <button type="submit" style={{ ...styles.btnSave, width: 'auto', background: '#5d4037' }}>Ověřit</button>
        </form>
        <h5 style={{ margin: '0 0 10px 0', borderTop: '1px solid #eee', paddingTop: '10px' }}>Koupit prodloužení</h5>
        <button disabled style={{ ...styles.btnOutline, background: '#eee', color: '#888', cursor: 'not-allowed', marginBottom: '8px' }}>
          💳 Platební brána (Připravujeme)
        </button>
        <button onClick={handleContactSupport} style={{ ...styles.btnSave, background: '#0288d1' }}>
          ✉️ Kontaktovat podporu
        </button>
      </div>
    );
  };

  const renderGlobalCalendar = () => {
    if (myHorses.length === 0) return null;
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
        <h4 style={{ margin: '0 0 10px 0', color: '#5d4037', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>📅 Kalendář</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
          {myHorses.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getHorseColor(h.id) }}></div>
              <span>{h.name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={() => changeMonth(-1)} style={styles.btnCalNavSmall}>◀</button>
          <strong style={{ fontSize: '0.9rem', color: '#5d4037' }}>{monthNames[month]} {year}</strong>
          <button onClick={() => changeMonth(1)} style={styles.btnCalNavSmall}>▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontWeight: 'bold', color: '#888', marginBottom: '4px', fontSize: '0.7rem' }}>
          <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {daysArray.map((day, idx) => {
            if (!day) return <div key={idx} style={{ background: '#f9f9f9', borderRadius: '4px', minHeight: '35px' }}></div>;
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
            const isSelected = newLog.date === cellDateStr; 
            const dayLogs = allDiaryLogs.filter(log => log.date === cellDateStr);
            return (
              <div 
                key={idx} 
                onClick={() => setCalendarDetailDate(cellDateStr)} 
                style={{ 
                  border: isSelected ? '2px solid #5d4037' : '1px solid #eee', 
                  background: isSelected ? '#fff3e0' : '#fff', 
                  borderRadius: '4px', minHeight: '35px', padding: '2px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' 
                }}
              >
                <span style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#5d4037' : '#333', fontSize: '0.8rem' }}>{day}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', marginTop: 'auto', width: '100%' }}>
                  {dayLogs.map(log => ( 
                    <div key={log.id} title={log.training_type} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getHorseColor(log.horse_id) }}></div> 
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
            <h3 style={{ margin: 0, color: '#3e2723' }}>📅 {new Date(calendarDetailDate).toLocaleDateString('cs-CZ')}</h3>
            <button onClick={() => setCalendarDetailDate(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
          </div>
          {logsForDay.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>Žádné záznamy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logsForDay.map(log => { 
                const horse = myHorses.find(h => h.id === log.horse_id); 
                return (
                  <div key={log.id} style={{ padding: '12px', borderRadius: '8px', borderLeft: `5px solid ${getHorseColor(log.horse_id)}`, background: '#fafafa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ color: '#333' }}>{horse?.name || 'Neznámý kůň'}</strong>
                      <span style={{ background: getTypeColor(log.training_type), color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{log.training_type}</span>
                    </div>
                    {log.rating > 0 && <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{'⭐'.repeat(log.rating)}</div>}
                    <div style={{ color: '#555', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{log.notes}</div>
                  </div>
                ); 
              })}
            </div>
          )}
          <button 
            onClick={() => { setNewLog({...newLog, date: calendarDetailDate}); setCalendarDetailDate(null); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} 
            style={{ ...styles.btnPrimary, width: '100%', marginTop: '20px' }}
          >
            + Záznam na tento den
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={styles.loader}>Načítám...</div>;

  return (
    <div style={styles.container}>
      <style>{mobileStyles}</style>
      {renderCalendarDetailModal()}
      
      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-only" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>☰ Stáj</button>
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
                <h3 style={{ color: '#2e7d32', margin: '0 0 5px 0' }}>Připojení k týmu!</h3>
                <p style={{ margin: 0, color: '#333' }}>Založte si účet, nebo se přihlaste k existujícímu účtu pro přijetí pozvánky.</p>
              </div>
            ) : (
              <>
                <h1 style={{ color: '#5d4037', margin: '0 0 10px 0' }}>Vítejte ve stáji</h1>
                <p style={{ color: '#888', margin: 0 }}>Přihlaste se nebo zkuste Trial.</p>
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
              {isSignUp ? (inviteToken ? 'ZAREGISTROVAT A PŘIJMOUT' : 'ZALOŽIT TRIAL ZDARMA') : 'PŘIHLÁSIT SE'}
            </button>
          </form>
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={styles.btnText}
          >
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se.'}
          </button>
        </div>
      ) : adminView ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <div style={{ background: '#e3f2fd', padding: '25px', borderRadius: '12px', border: '2px solid #0288d1', marginBottom: '30px' }}>
             <h2 style={{ color: '#0288d1', margin: '0 0 15px 0' }}>🔑 Generátor licenčních klíčů</h2>
             <form onSubmit={handleGenerateLicenseKey} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
               <div style={{ flex: 2, minWidth: '200px' }}>
                 <label style={styles.formLabel}>E-mail (kam poslat kód)</label>
                 <input type="email" value={adminGenEmail} onChange={e => setAdminGenEmail(e.target.value)} style={styles.input} required />
               </div>
               <div style={{ flex: 1, minWidth: '150px' }}>
                 <label style={styles.formLabel}>Platnost</label>
                 <select value={adminGenDuration} onChange={e => setAdminGenDuration(e.target.value)} style={styles.input}>
                   <option value="1">1 měsíc</option>
                   <option value="6">6 měsíců</option>
                   <option value="12">12 měsíců (1 rok)</option>
                 </select>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                 <button type="submit" style={{ ...styles.btnPrimary, background: '#0288d1', marginBottom: '8px', padding: '12px 25px' }}>
                   Vygenerovat & Odeslat
                 </button>
               </div>
             </form>
          </div>
          <div style={styles.card}>
            <h3 style={{ color: '#e65100' }}>🏢 Správa Stájí</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f9f9f9' }}>
                    <th style={{ padding: '12px' }}>Název klubu</th>
                    <th style={{ padding: '12px' }}>Majitel</th>
                    <th style={{ padding: '12px' }}>Stav</th>
                    <th style={{ padding: '12px' }}>Nová Licence</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(c => {
                    const isTrial = c.trial_ends_at && new Date(c.trial_ends_at) > new Date() && (!c.license_valid_until || new Date(c.license_valid_until) < new Date()); 
                    const isPaid = c.license_valid_until && new Date(c.license_valid_until) > new Date(); 
                    const currentDateVal = editingClubDates[c.id] !== undefined ? editingClubDates[c.id] : (c.license_valid_until ? c.license_valid_until.split('T')[0] : '');
                    
                    return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.name}</td>
                      <td style={{ padding: '12px', color: '#0288d1' }}>{c.owner_email}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                        {isPaid ? <span style={{ color: 'green' }}>Placená</span> : isTrial ? <span style={{ color: 'orange' }}>Trial</span> : <span style={{ color: 'red' }}>Vypršela</span>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <input type="date" value={currentDateVal} onChange={(e) => handleClubDateChange(c.id, e.target.value)} style={{ ...styles.inputSmall, width: '150px' }} />
                          <button onClick={() => handleUpdateClubLicense(c.id, c.name)} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Uložit</button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-layout" style={styles.mainGrid}>
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={styles.sideCard}>
            <div style={{ display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee' }}>
              <button onClick={() => setSidebarTab('profil')} style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'profil' ? '#5d4037' : '#888' }}>👤 Profil</button>
              <button onClick={() => setSidebarTab('tym')} style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'tym' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'tym' ? '#5d4037' : '#888' }}>👥 Tým</button>
              {userRole === 'owner' && <button onClick={() => setSidebarTab('licence')} style={{ ...styles.tabBtn, borderBottom: sidebarTab === 'licence' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'licence' ? '#5d4037' : '#888' }}>🔑 Licence</button>}
            </div>

            {sidebarTab === 'profil' && (
              <>
                {editMode ? (
                  <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={styles.formLabel}>Jméno a příjmení</label>
                    <input style={styles.inputSmall} value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
                    
                    {userRole === 'owner' && (
                      <>
                        <label style={styles.formLabel}>Název stáje</label>
                        <input style={styles.inputSmall} value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} />
                      </>
                    )}
                    <button type="submit" style={styles.btnSave}>Uložit</button>
                    <button type="button" onClick={() => setEditMode(false)} style={{ ...styles.btnSave, background: '#ccc' }}>Zrušit</button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name}</strong></p>
                    <p style={{ fontSize:'0.8rem', color:'#666' }}>{myClub?.name || profile?.stable || 'Bez stáje'}</p>
                    <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit profil</button>
                    <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={styles.btnSignOut}>Odhlásit</button>
                  </div>
                )}
                {renderGlobalCalendar()}
              </>
            )}

            {sidebarTab === 'tym' && (
              <div>
                {userRole === 'owner' && (
                  <>
                    <h4 style={{ margin: '0 0 10px 0', color: '#5d4037' }}>Přidat člena týmu</h4>
                    <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', background: '#fafafa', padding: '10px', borderRadius: '8px' }}>
                      <label style={styles.formLabel}>E-mail člena:</label>
                      <input type="email" value={inviteNewEmail} onChange={e => setInviteNewEmail(e.target.value)} style={styles.inputSmall} required />
                      
                      <label style={styles.formLabel}>Role:</label>
                      <select value={inviteNewRole} onChange={e => setInviteNewRole(e.target.value)} style={styles.inputSmall}>
                        <option value="owner">HO - Hospodář</option>
                        <option value="collaborator">SP - Spolupracovník</option>
                        <option value="trainer">TR - Trenér</option>
                        <option value="farrier">KO - Kovář</option>
                        <option value="vet">VE - Veterinář</option>
                      </select>
                      <button type="submit" style={{ ...styles.btnSave, background: '#4caf50' }}>Vygenerovat odkaz</button>
                    </form>
                  </>
                )}
                <h4 style={{ margin: '0 0 10px 0', color: '#5d4037' }}>Členové stáje</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {teamMembers.map(member => {
                    const roleNames = { 'owner': 'HO', 'collaborator': 'SP', 'trainer': 'TR', 'farrier': 'KO', 'vet': 'VE' };
                    return (
                    <li key={member.id} style={{ fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        <strong>{member.profiles?.full_name || 'Nováček'}</strong><br/>
                        <span style={{ color: '#666', fontSize: '0.75rem' }}>{member.profiles?.email}</span>
                      </span>
                      <span style={{ background: member.role === 'owner' ? '#ffb300' : '#e0e0e0', padding: '2px 6px', borderRadius: '10px' }}>
                        {roleNames[member.role] || member.role}
                      </span>
                    </li>
                  )})}
                </ul>
              </div>
            )}
            {sidebarTab === 'licence' && userRole === 'owner' && <div>{renderLicenseStatus()}</div>}
          </div>

          {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

          <div className="main-content">
            <div style={styles.contentGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#3e2723' }}>Moje koně ({myClub?.name || 'Moje'})</h3>
                  {(userRole === 'owner' || userRole === 'collaborator') && (
                    <button onClick={() => { setIsEditingHorse(true); setCurrentHorseId(null); }} style={styles.btnAdd}>+ Nový kůň</button>
                  )}
                </div>

                <div style={styles.horseList}>
                  {myHorses.map(h => {
                    const vacS = getHealthStatus(h.vaccination_date); 
                    const farS = getHealthStatus(h.farrier_date); 
                    const isD = expandedDiaryId === h.id;
                    const horseLogs = allDiaryLogs.filter(l => l.horse_id === h.id); 
                    const totalSpent = horseLogs.reduce((acc, l) => acc + (l.cost || 0), 0);
                    
                    return (
                      <div key={h.id} style={{ ...styles.horseCard, borderLeft: `6px solid ${getHorseColor(h.id)}` }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                          <img src={h.photo_url || 'https://via.placeholder.com/80?text=KŮŇ'} style={{ width:'60px', height:'60px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${getHorseColor(h.id)}` }} />
                          <div style={{ flex:1 }}>
                            <h4 style={{ margin:0 }}>{h.name}</h4>
                            <small>{h.birth_year}</small>
                          </div>
                          {(userRole === 'owner' || userRole === 'collaborator') && (
                            <>
                              <button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button>
                              <button onClick={() => deleteHorse(h.id, h.name)} style={styles.btnIconDelete}>🗑️</button>
                            </>
                          )}
                        </div>
                        
                        {(userRole === 'owner' || userRole === 'collaborator') && (
                          <div style={{ background: '#fcfcfc', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #eee' }}>
                            <div style={{ ...styles.infoRow, borderBottom: 'none', paddingBottom: 0 }}>
                              <span>💉 Očkování: <span style={{ color:vacS.color }}>{h.vaccination_date ? new Date(h.vaccination_date).toLocaleDateString() : '?'}</span></span>
                              {h.vaccination_date && <a href={createGCalLink(`Očkování - ${h.name}`, h.vaccination_date)} target="_blank" rel="noopener noreferrer" style={styles.gcalLink}>📅 Google</a>}
                            </div>
                            <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                              <span>⚒️ Kovář: <span style={{ color:farS.color }}>{h.farrier_date ? new Date(h.farrier_date).toLocaleDateString() : '?'}</span></span>
                              {h.farrier_date && <a href={createGCalLink(`Kovář - ${h.name}`, h.farrier_date)} target="_blank" rel="noopener noreferrer" style={styles.gcalLink}>📅 Google</a>}
                            </div>
                          </div>
                        )}
                        
                        <button onClick={() => toggleDiary(h.id)} style={{ ...styles.btnOutline, width:'100%', marginTop:'5px', background: isD ? '#f5f5f5' : 'transparent' }}>
                          {isD ? '📖 Zavřít deník' : '📖 Otevřít deník tréninků'}
                        </button>
                        
                        {isD && (
                          <div style={{ marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px', border: '1px solid #eee' }}>
                            {(userRole === 'owner' || userRole === 'collaborator') && (
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'15px', fontWeight:'bold', color:'#2e7d32', fontSize: '1.1rem' }}>
                                <span>Roční výdaje:</span> <span>{totalSpent.toLocaleString('cs-CZ')} Kč</span>
                              </div>
                            )}
                            <form onSubmit={(e) => saveDiaryLog(e, h.id)} style={{ display:'grid', gap:'8px', gridTemplateColumns:'1fr 1fr', marginBottom:'25px' }}>
                              <div style={{ gridColumn: 'span 2' }}>
                                <label style={styles.formLabel}>Datum:</label>
                                <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} />
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <label style={styles.formLabel}>Typ:</label>
                                <select value={newLog.type} onChange={e=>setNewLog({...newLog, type:e.target.value})} style={{ ...styles.inputSmall, background: getTypeColor(newLog.type) }}>
                                  <option value="Jízdárna">Jízdárna</option>
                                  <option value="Lonž">Lonž</option>
                                  <option value="Terén">Terén</option>
                                  <option value="Skoky">Skoky</option>
                                </select>
                              </div>
                              {(userRole === 'owner' || userRole === 'collaborator') && (
                                <div style={{ gridColumn: 'span 1' }}>
                                  <label style={styles.formLabel}>Kč:</label>
                                  <input type="number" value={newLog.cost || ''} onChange={e=>setNewLog({...newLog, cost:parseInt(e.target.value)||0})} style={styles.inputSmall} />
                                </div>
                              )}
                              <div style={{ gridColumn: (userRole === 'owner' || userRole === 'collaborator') ? 'span 1' : 'span 2' }}>
                                <label style={styles.formLabel}>Hodnocení:</label>
                                <select value={newLog.rating} onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}>
                                  <option value="0">Bez</option>
                                  <option value="5">⭐⭐⭐⭐⭐</option>
                                  <option value="3">⭐⭐⭐</option>
                                  <option value="1">⭐</option>
                                </select>
                              </div>
                              <div style={{ gridColumn:'span 2' }}>
                                <label style={styles.formLabel}>Příloha:</label>
                                <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{ ...styles.inputSmall, background: '#fff' }} />
                              </div>
                              <div style={{ gridColumn:'span 2' }}>
                                <label style={styles.formLabel}>Zpráva:</label>
                                <textarea value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{ ...styles.inputSmall, height: '60px' }} />
                              </div>
                              <button type="submit" style={{ gridColumn:'span 2', background:'#0288d1', color:'#fff', border:'none', padding:'10px', borderRadius:'6px', cursor: 'pointer' }}>
                                Uložit
                              </button>
                            </form>
                            <h4 style={{ margin: '15px 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Historie</h4>
                            {horseLogs.length === 0 ? (
                              <p style={{ fontSize: '0.85rem', color: '#888' }}>Nic.</p>
                            ) : horseLogs.map(log => (
                              <div key={log.id} style={{ fontSize:'0.85rem', padding:'12px', borderLeft:`4px solid ${getTypeColor(log.training_type)}`, background: '#fff', marginBottom: '10px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                  <strong>{new Date(log.date).toLocaleDateString()} - {log.training_type}</strong>
                                  <button onClick={() => deleteDiaryLog(log.id)} style={{ background:'none', border:'none', color:'#e57373', cursor:'pointer' }}>Smazat</button>
                                </div>
                                <div style={{ color:'#555', whiteSpace: 'pre-wrap' }}>{log.notes}</div>
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
                  <h3 style={{ marginTop: 0, color: '#5d4037' }}>{currentHorseId ? 'Upravit kartu koně' : 'Nová karta koně'}</h3>
                  <form onSubmit={handleSaveHorse} style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                    <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
                      <label style={styles.formLabel}>Fotka</label>
                      <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{ ...styles.inputSmall, background: '#fff' }} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Jméno *</label>
                      <input value={horseData.name} onChange={e=>setHorseData({...horseData, name:e.target.value})} style={styles.input} required />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label style={styles.formLabel}>Rok</label>
                        <input type="number" value={horseData.birth_year} onChange={e=>setHorseData({...horseData, birth_year:e.target.value})} style={styles.input} />
                      </div>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label style={styles.formLabel}>ID</label>
                        <input value={horseData.horse_id_number} onChange={e=>setHorseData({...horseData, horse_id_number:e.target.value})} style={styles.input} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label style={styles.formLabel}>Očkování:</label>
                        <input type="date" value={horseData.vaccination_date} onChange={e=>setHorseData({...horseData, vaccination_date:e.target.value})} style={styles.input} />
                      </div>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label style={styles.formLabel}>Kovář:</label>
                        <input type="date" value={horseData.farrier_date} onChange={e=>setHorseData({...horseData, farrier_date:e.target.value})} style={styles.input} />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Poznámky:</label>
                      <textarea value={horseData.diet_notes} onChange={e=>setHorseData({...horseData, diet_notes:e.target.value})} style={styles.input} />
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
    .mobile-only { display: block !important; }
  }
  .mobile-only { display: none; }
`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' }, 
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }, 
  topNav: { display: 'flex', background: '#3e2723', padding: '15px', alignItems: 'center', justifyContent: 'space-between' }, 
  hamburgerBtn: { background: '#ffb300', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold' }, 
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }, 
  btnCalNavSmall: { background: '#eee', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }, 
  mainGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', maxWidth: '1400px', margin: '0 auto', padding: '20px' }, 
  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }, 
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }, 
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037', borderRight: '1px solid #eee' }, 
  horseCard: { background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }, 
  formCard: { backgroundColor: '#fafafa', padding: '20px', borderRadius: '12px', border: '1px solid #ddd' }, 
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem' }, 
  gcalLink: { background: '#fff', color: '#4285F4', border: '1px solid #4285F4', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold', transition: 'all 0.2s' }, 
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }, 
  inputSmall: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' }, 
  formLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#666', marginBottom: '-2px' }, 
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' }, 
  tabBtn: { background: 'transparent', border: 'none', flex: 1, padding: '10px', cursor: 'pointer', fontWeight: 'bold' }, 
  btnSave: { background: '#4caf50', color: '#fff', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }, 
  btnAdd: { background: '#4caf50', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }, 
  btnPrimary: { background: '#5d4037', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }, 
  btnOutline: { background: 'transparent', border: '1px solid #888', padding: '10px', borderRadius: '6px', width: '100%', cursor: 'pointer' }, 
  btnIconEdit: { background: '#e3f2fd', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }, 
  btnIconDelete: { background: '#ffebee', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }, 
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', width: '100%', marginTop: '10px', cursor: 'pointer' }, 
  btnSignOut: { background: '#e57373', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', marginTop: '10px', width: '100%', cursor: 'pointer' }, 
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }, 
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }
};
