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
    date: new Date().toISOString().split('T')[0], type: 'Jízdárna', notes: '', cost: 0, rating: 0 
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
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite');
    if (token) {
      setInviteToken(token);
      setIsSignUp(true);
      checkInviteToken(token);
    }
    checkUser(); 
  }, []);

  async function checkInviteToken(token) {
    const { data } = await supabase.from('invitations').select('*').eq('token', token).single();
    if (data && !data.is_accepted) setEmail(data.email); 
  }

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        if (prof?.club_id) {
          const { data: clubData } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single();
          setMyClub(clubData);
          
          const { data: memberData } = await supabase.from('club_members').select('role').eq('club_id', prof.club_id).eq('user_id', authUser.id).single();
          if (memberData) {
            setUserRole(memberData.role);
          } else if (prof.club_id === '00000000-0000-0000-0000-000000000000') {
            setUserRole('owner');
          }

          await fetchMyHorses(prof.club_id, authUser.id);
          await fetchTeam(prof.club_id);
        } else {
          setUserRole('owner');
          await fetchMyHorses(null, authUser.id);
        }
        
        if (prof?.role === 'superadmin') await fetchClubs();
      }
    } finally { setLoading(false); }
  }

  async function fetchTeam(clubId) {
    if (!clubId) return setTeamMembers([]);
    // Zobrazíme členy i ve výchozím klubu pro testování
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
    e.preventDefault(); setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user) {
        let targetClubId = null; let role = 'owner';
        if (inviteToken) {
          const { data: invData } = await supabase.from('invitations').select('*').eq('token', inviteToken).single();
          if (invData && !invData.is_accepted) {
            targetClubId = invData.club_id; role = invData.role;
            await supabase.from('invitations').update({ is_accepted: true }).eq('id', invData.id);
          }
        } 
        if (!targetClubId) {
          const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14);
          const { data: newClub, error: clubErr } = await supabase.from('clubs').insert([{ name: 'Moje Stáj', is_active: true, trial_ends_at: trialEnd.toISOString() }]).select().single();
          if (!clubErr && newClub) targetClubId = newClub.id;
        }
        if (targetClubId) {
          await supabase.from('club_members').insert([{ club_id: targetClubId, user_id: data.user.id, role: role }]);
          await supabase.from('profiles').insert([{ id: data.user.id, email: email, license_type: 'Hobby', club_id: targetClubId }]);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message); else window.location.reload();
    }
    setLoading(false);
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!profile?.club_id) return alert('Klub nebyl nalezen.');
    // Odstraněna podmínka pro zablokování defaultního klubu
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase.from('invitations').insert([{ club_id: profile.club_id, email: inviteNewEmail, role: inviteNewRole, token: token }]);
    if (error) alert('Chyba: ' + error.message);
    else {
      const link = `${window.location.origin}${window.location.pathname}?invite=${token}`;
      navigator.clipboard.writeText(link).then(() => { alert(`Pozvánka zkopírována do schránky:\n${link}`); setInviteNewEmail(''); });
    }
  };

  const handleContactSupport = async () => {
    try {
      alert('Odesílám žádost na podporu...');
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Žádost o licenci - ${myClub?.name || 'Neznámá stáj'}`,
          text: `Uživatel: ${profile?.email}\nStáj: ${myClub?.name || 'Neznámá stáj'}\n\nŽádá o prodloužení nebo zakoupení licence v systému Jezdecké Impérium.`,
          emails: ['l.vosika@arastea.cz']
        })
      });
      alert('Vaše žádost byla úspěšně odeslána. Brzy se vám ozveme s fakturou a licenčním klíčem!');
    } catch (err) {
      alert('Nepodařilo se odeslat e-mail. Kontaktujte nás prosím přímo na l.vosika@arastea.cz');
    }
  };

  const handleApplyLicense = async (e) => {
    e.preventDefault();
    const key = licenseKeyInput.trim();
    if (!key) return;

    const { data: keyData, error: keyErr } = await supabase.from('license_keys').select('*').eq('key_code', key).single();
    if (keyErr || !keyData) return alert('Tento licenční klíč neexistuje nebo je neplatný.');
    if (keyData.is_used) return alert('Tento licenční klíč již byl použit.');

    const now = new Date();
    const currentValidUntil = myClub.license_valid_until ? new Date(myClub.license_valid_until) : now;
    const startDate = currentValidUntil > now ? currentValidUntil : now;
    
    startDate.setMonth(startDate.getMonth() + keyData.duration_months);
    const newDateStr = startDate.toISOString();

    await supabase.from('clubs').update({ license_valid_until: newDateStr }).eq('id', myClub.id);
    await supabase.from('license_keys').update({ is_used: true }).eq('id', keyData.id);

    alert(`Gratulujeme! Vaše licence byla prodloužena do ${startDate.toLocaleDateString('cs-CZ')}.`);
    setLicenseKeyInput('');
    window.location.reload();
  };

  const handleGenerateLicenseKey = async (e) => {
    e.preventDefault();
    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const keyCode = `LIC-${randomPart1}-${randomPart2}`;
    const duration = parseInt(adminGenDuration) || 12;

    const { error } = await supabase.from('license_keys').insert([{ key_code: keyCode, duration_months: duration, is_used: false }]);
    
    if (error) return alert('Chyba při generování klíče do databáze: ' + error.message);

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Váš licenční klíč - Jezdecké Impérium',
          text: `Dobrý den,\n\nděkujeme za vaši platbu. Zde je váš licenční klíč pro Jezdecké Impérium s platností na ${duration} měsíců:\n\nKLÍČ: ${keyCode}\n\nZadejte jej ve své aplikaci v sekci "Můj Profil -> Licence".\n\nS pozdravem,\nTým Jezdecké Impérium`,
          emails: [adminGenEmail]
        })
      });
      alert(`Klíč ${keyCode} byl odeslán na ${adminGenEmail}.`);
      setAdminGenEmail('');
    } catch (err) {
      alert(`Klíč vygenerován (${keyCode}), ale e-mail se NEpodařilo odeslat.`);
    }
  };

  const handleUpdateClubLicense = async (clubId, clubName) => {
    const newDate = editingClubDates[clubId];
    if (!newDate) return alert('Zadejte prosím platné datum.');
    if (confirm(`Opravdu změnit platnost licence pro ${clubName} na ${new Date(newDate).toLocaleDateString('cs-CZ')}?`)) {
      const { error } = await supabase.from('clubs').update({ license_valid_until: newDate }).eq('id', clubId);
      if (error) alert(error.message); else { alert('Licence úspěšně aktualizována!'); fetchClubs(); }
    }
  };

  const handleClubDateChange = (clubId, dateValue) => setEditingClubDates(prev => ({ ...prev, [clubId]: dateValue }));

  const getHorseColor = (horseId) => HORSE_COLORS[myHorses.findIndex(h => h.id === horseId) % HORSE_COLORS.length] || '#333';
  const getTypeColor = (type) => {
    const colors = { 'Jízdárna': '#1976d2', 'Lonž': '#8e24aa', 'Terén': '#388e3c', 'Skoky': '#f57f17', 'Odpočinek': '#9e9e9e', 'Veterinář': '#00838f', 'Zuby': '#00838f', 'Fyzio': '#00838f', 'Kovář': '#5d4037' };
    return colors[type] || '#333';
  };

  const toggleDiary = (horseId) => {
    if (expandedDiaryId === horseId) setExpandedDiaryId(null); 
    else { setExpandedDiaryId(horseId); setNewLog({ date: new Date().toISOString().split('T')[0], type: 'Jízdárna', notes: '', cost: 0, rating: 0 }); }
  };

  const saveDiaryLog = async (e, horseId) => {
    e.preventDefault();
    let attUrl = null;
    if (docFile) {
      const fExt = docFile.name.split('.').pop();
      const fName = `${Math.random()}.${fExt}`;
      const { error: upErr } = await supabase.storage.from('horse_docs').upload(fName, docFile);
      if (!upErr) { const { data } = supabase.storage.from('horse_docs').getPublicUrl(fName); attUrl = data.publicUrl; }
    }
    const { error } = await supabase.from('horse_diary').insert([{ horse_id: horseId, club_id: profile?.club_id, date: newLog.date, training_type: newLog.type, notes: newLog.notes, cost: newLog.cost, rating: newLog.rating, attachment_url: attUrl }]);
    if (error) alert(error.message);
    else {
      const horseIds = myHorses.map(h => h.id);
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
      setAllDiaryLogs(logs || []);
      setNewLog({ date: newLog.date, type: 'Jízdárna', notes: '', cost: 0, rating: 0 });
      setDocFile(null);
    }
  };

  const deleteDiaryLog = async (logId) => {
    if(confirm('Opravdu smazat tento záznam?')) {
      await supabase.from('horse_diary').delete().eq('id', logId);
      const horseIds = myHorses.map(h => h.id);
      const { data: logs } = await supabase.from('horse_diary').select('*').in('horse_id', horseIds);
      setAllDiaryLogs(logs || []);
    }
  };

  const deleteHorse = async (id, name) => {
    if (confirm(`Smazat koně ${name}?`)) { await supabase.from('horses').delete().eq('id', id); fetchMyHorses(profile?.club_id, user.id); }
  };

  const resetHorseForm = () => {
    setHorseData({ name: '', birth_year: '', horse_id_number: '', vaccination_date: '', farrier_date: '', diet_notes: '', photo_url: '' });
    setPhotoFile(null); setCurrentHorseId(null); setIsEditingHorse(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    await supabase.from('profiles').update({ full_name: profile.full_name, phone: profile.phone, stable: profile.stable, city: profile.city, birth_date: profile.birth_date, license_type: profile.license_type }).eq('id', user.id);
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
    const payload = { owner_id: user.id, club_id: profile?.club_id, name: horseData.name, birth_year: horseData.birth_year, horse_id_number: horseData.horse_id_number, vaccination_date: horseData.vaccination_date || null, farrier_date: horseData.farrier_date || null, diet_notes: horseData.diet_notes, photo_url: finalPhotoUrl };
    if (currentHorseId) await supabase.from('horses').update(payload).eq('id', currentHorseId);
    else await supabase.from('horses').insert([payload]);
    resetHorseForm(); fetchMyHorses(profile?.club_id, user.id);
  };

  const editHorse = (h) => { setHorseData({ ...h, vaccination_date: h.vaccination_date || '', farrier_date: h.farrier_date || '' }); setCurrentHorseId(h.id); setIsEditingHorse(true); };
  const changeMonth = (offset) => { const newDate = new Date(calendarMonth); newDate.setMonth(newDate.getMonth() + offset); setCalendarMonth(newDate); };

  const renderLicenseStatus = () => {
    if (!myClub) return null;
    const now = new Date();
    const trialEnd = myClub.trial_ends_at ? new Date(myClub.trial_ends_at) : null;
    const licenseEnd = myClub.license_valid_until ? new Date(myClub.license_valid_until) : null;
    
    let statusText = ''; let statusColor = ''; let daysLeft = 0;
    if (licenseEnd && licenseEnd > now) { statusText = `Aktivní licence (do ${licenseEnd.toLocaleDateString('cs-CZ')})`; statusColor = '#2e7d32'; } 
    else if (trialEnd && trialEnd > now) { daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)); statusText = `Zkušební verze (zbývá ${daysLeft} dní)`; statusColor = '#f57f17'; } 
    else { statusText = 'Licence vypršela'; statusColor = '#d32f2f'; }

    return (
      <div style={{background: '#fafafa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd'}}>
        <h4 style={{margin: '0 0 10px 0', color: '#5d4037'}}>Stav předplatného</h4>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px'}}><div style={{width: '12px', height: '12px', borderRadius: '50%', background: statusColor}}></div><strong style={{color: statusColor}}>{statusText}</strong></div>
        <form onSubmit={handleApplyLicense} style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
          <input type="text" placeholder="Zadejte licenční klíč..." value={licenseKeyInput} onChange={e => setLicenseKeyInput(e.target.value)} style={styles.inputSmall} required />
          <button type="submit" style={{...styles.btnSave, width: 'auto', background: '#5d4037'}}>Ověřit</button>
        </form>
        <h5 style={{margin: '0 0 10px 0', borderTop: '1px solid #eee', paddingTop: '10px'}}>Koupit prodloužení</h5>
        <button disabled style={{...styles.btnOutline, background: '#eee', color: '#888', border: '1px dashed #ccc', cursor: 'not-allowed', marginBottom: '8px'}}>💳 Platební brána (Připravujeme)</button>
        <button onClick={handleContactSupport} style={{...styles.btnSave, background: '#0288d1'}}>✉️ Kontaktovat podporu pro licenci</button>
      </div>
    );
  };

  const renderGlobalCalendar = () => {
    if (myHorses.length === 0) return null;
    const year = calendarMonth.getFullYear(); const month = calendarMonth.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay(); firstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
    const daysArray = []; for (let i = 0; i < firstDay; i++) daysArray.push(null); for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

    return (
      <div style={{background: '#fff', borderRadius: '8px', padding: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: '20px', border: '1px solid #eee'}}>
        <h4 style={{margin: '0 0 10px 0', color: '#5d4037', borderBottom: '1px solid #ddd', paddingBottom: '5px'}}>📅 Kalendář stáje</h4>
        <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px'}}>
          {myHorses.map(h => (
            <div key={h.id} style={{display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 'bold', color: '#555'}}><div style={{width: '10px', height: '10px', borderRadius: '50%', background: getHorseColor(h.id)}}></div><span>{h.name}</span></div>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
          <button onClick={() => changeMonth(-1)} style={styles.btnCalNavSmall}>◀</button><strong style={{fontSize: '0.9rem', color: '#5d4037'}}>{monthNames[month]} {year}</strong><button onClick={() => changeMonth(1)} style={styles.btnCalNavSmall}>▶</button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontWeight: 'bold', color: '#888', marginBottom: '4px', fontSize: '0.7rem'}}><div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div></div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px'}}>
          {daysArray.map((day, idx) => {
            if (!day) return <div key={idx} style={{background: '#f9f9f9', borderRadius: '4px', minHeight: '35px'}}></div>;
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = newLog.date === cellDateStr;
            const dayLogs = allDiaryLogs.filter(log => log.date === cellDateStr);
            return (
              <div key={idx} onClick={() => setCalendarDetailDate(cellDateStr)} style={{ border: isSelected ? '2px solid #5d4037' : '1px solid #eee', background: isSelected ? '#fff3e0' : '#fff', borderRadius: '4px', minHeight: '35px', padding: '2px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                <span style={{fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#5d4037' : '#333', fontSize: '0.8rem'}}>{day}</span>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', marginTop: 'auto', width: '100%'}}>
                  {dayLogs.map(log => ( <div key={log.id} title={log.training_type} style={{width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getHorseColor(log.horse_id)}}></div> ))}
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
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px'}}>
            <h3 style={{margin: 0, color: '#3e2723'}}>📅 Záznamy pro {new Date(calendarDetailDate).toLocaleDateString('cs-CZ')}</h3>
            <button onClick={() => setCalendarDetailDate(null)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888'}}>×</button>
          </div>
          {logsForDay.length === 0 ? <p style={{color: '#666', textAlign: 'center', padding: '20px 0'}}>Pro tento den nejsou žádné záznamy.</p> : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {logsForDay.map(log => {
                const horse = myHorses.find(h => h.id === log.horse_id);
                return (
                  <div key={log.id} style={{padding: '12px', borderRadius: '8px', borderLeft: `5px solid ${getHorseColor(log.horse_id)}`, background: '#fafafa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}><strong style={{color: '#333'}}>{horse?.name || 'Neznámý kůň'}</strong><span style={{background: getTypeColor(log.training_type), color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem'}}>{log.training_type}</span></div>
                    {log.rating > 0 && <div style={{fontSize: '0.9rem', marginBottom: '4px'}}>{'⭐'.repeat(log.rating)}</div>}
                    <div style={{color: '#555', fontSize: '0.9rem', whiteSpace: 'pre-wrap'}}>{log.notes}</div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => { setNewLog({...newLog, date: calendarDetailDate}); setCalendarDetailDate(null); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} style={{...styles.btnPrimary, width: '100%', marginTop: '20px'}}>+ Přidat nový záznam na tento den</button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={styles.loader}>Otevírám vrata stáje...</div>;

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
              <button onClick={() => setAdminView(!adminView)} style={{...styles.btnNavOutline, background: adminView ? '#fff' : 'transparent', color: adminView ? '#333' : '#ffb300'}}>
                {adminView ? '🐴 Zpět do stáje' : '🏢 Náhled Superadmin'}
              </button>
            )}
          </div>
        </div>
      )}

      {!user ? (
        <div style={{...styles.card, maxWidth: '400px', margin: '40px auto'}}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            {inviteToken ? (
              <div style={{background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '2px solid #4caf50'}}><h3 style={{color: '#2e7d32', margin: '0 0 5px 0'}}>Připojení k týmu!</h3><p style={{margin: 0, color: '#333'}}>Zadejte heslo pro dokončení registrace.</p></div>
            ) : (
              <><h1 style={{color: '#5d4037', margin: '0 0 10px 0'}}>Vítejte ve stáji</h1><p style={{color: '#888', margin: 0}}>Pro správu svých koní se prosím přihlaste nebo si založte 14denní Trial.</p></>
            )}
          </div>
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required disabled={!!inviteToken} />
            <input type="password" placeholder="Zvolte si heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZALOŽIT TRIAL ZDARMA' : 'VSTOUPIT'}</button>
          </form>
          {!inviteToken && <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>{isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zkuste 14 dní zdarma.'}</button>}
        </div>
      ) : adminView ? (
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
          <div style={{background: '#e3f2fd', padding: '25px', borderRadius: '12px', border: '2px solid #0288d1', marginBottom: '30px'}}>
             <h2 style={{color: '#0288d1', margin: '0 0 15px 0'}}>🔑 Generátor licenčních klíčů</h2>
             <form onSubmit={handleGenerateLicenseKey} style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
               <div style={{flex: 2, minWidth: '200px'}}><label style={styles.formLabel}>E-mail zákazníka (kam poslat kód)</label><input type="email" value={adminGenEmail} onChange={e => setAdminGenEmail(e.target.value)} style={styles.input} required /></div>
               <div style={{flex: 1, minWidth: '150px'}}><label style={styles.formLabel}>Platnost (v měsících)</label><select value={adminGenDuration} onChange={e => setAdminGenDuration(e.target.value)} style={styles.input}><option value="1">1 měsíc</option><option value="6">6 měsíců</option><option value="12">12 měsíců (1 rok)</option></select></div>
               <div style={{display: 'flex', alignItems: 'flex-end'}}><button type="submit" style={{...styles.btnPrimary, background: '#0288d1', marginBottom: '8px', padding: '12px 25px'}}>Vygenerovat & Odeslat e-mail</button></div>
             </form>
          </div>

          <div style={styles.card}>
            <h3 style={{color: '#e65100', borderBottom: '2px solid #e65100', paddingBottom: '10px'}}>🏢 Náhled Superadmin: Správa Stájí</h3>
            <div style={{overflowX: 'auto', marginTop: '20px'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px'}}>
                <thead>
                  <tr style={{background: '#f9f9f9'}}>
                    <th style={{padding: '12px', borderBottom: '1px solid #ddd'}}>Název klubu</th><th style={{padding: '12px', borderBottom: '1px solid #ddd'}}>E-mail Majitele</th><th style={{padding: '12px', borderBottom: '1px solid #ddd'}}>Stav (Konec Trialu)</th><th style={{padding: '12px', borderBottom: '1px solid #ddd'}}>Nová Platnost Licence</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(c => {
                    const isTrial = c.trial_ends_at && new Date(c.trial_ends_at) > new Date() && (!c.license_valid_until || new Date(c.license_valid_until) < new Date());
                    const isPaid = c.license_valid_until && new Date(c.license_valid_until) > new Date();
                    const currentDateVal = editingClubDates[c.id] !== undefined ? editingClubDates[c.id] : (c.license_valid_until ? c.license_valid_until.split('T')[0] : '');
                    return (
                    <tr key={c.id} style={{borderBottom: '1px solid #eee'}}>
                      <td style={{padding: '12px', fontWeight: 'bold'}}>{c.name}</td>
                      <td style={{padding: '12px', color: '#0288d1'}}>{c.owner_email}</td>
                      <td style={{padding: '12px', fontSize: '0.85rem'}}>
                        {isPaid ? <span style={{color: 'green', fontWeight: 'bold'}}>Placená</span> : isTrial ? <span style={{color: 'orange'}}>Trial (do {new Date(c.trial_ends_at).toLocaleDateString()})</span> : <span style={{color: 'red', fontWeight: 'bold'}}>Vypršela</span>}
                      </td>
                      <td style={{padding: '12px'}}>
                        <div style={{display: 'flex', gap: '5px'}}>
                          <input type="date" value={currentDateVal} onChange={(e) => handleClubDateChange(c.id, e.target.value)} style={{...styles.inputSmall, width: '150px'}} />
                          <button onClick={() => handleUpdateClubLicense(c.id, c.name)} style={{background: '#4caf50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'}}>Uložit datum</button>
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
            
            <div style={{display: 'flex', marginBottom: '15px', borderBottom: '2px solid #eee'}}>
              <button onClick={() => setSidebarTab('profil')} style={{...styles.tabBtn, borderBottom: sidebarTab === 'profil' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'profil' ? '#5d4037' : '#888', fontSize: '0.85rem'}}>👤 Profil</button>
              <button onClick={() => setSidebarTab('tym')} style={{...styles.tabBtn, borderBottom: sidebarTab === 'tym' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'tym' ? '#5d4037' : '#888', fontSize: '0.85rem'}}>👥 Tým</button>
              {userRole === 'owner' && <button onClick={() => setSidebarTab('licence')} style={{...styles.tabBtn, borderBottom: sidebarTab === 'licence' ? '3px solid #5d4037' : 'none', color: sidebarTab === 'licence' ? '#5d4037' : '#888', fontSize: '0.85rem'}}>🔑 Licence</button>}
            </div>

            {sidebarTab === 'profil' && (
              <>
                {editMode ? (
                  <form onSubmit={updateProfile} style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <label style={styles.formLabel}>Jméno a příjmení</label><input style={styles.inputSmall} value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} placeholder="Jméno" />
                    <label style={styles.formLabel}>Licence jezdce</label><select style={styles.inputSmall} value={profile?.license_type || 'Hobby'} onChange={e => setProfile({...profile, license_type: e.target.value})}><option value="Hobby">Hobby</option><option value="ZZVJ">ZZVJ</option><option value="Profi">Profi</option></select>
                    {userRole === 'owner' && <><label style={styles.formLabel}>Název stáje</label><input style={styles.inputSmall} value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} placeholder="Hospodářství" /></>}
                    <button type="submit" style={styles.btnSave}>Uložit</button><button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc'}}>Zrušit</button>
                  </form>
                ) : (
                  <div>
                    <p><strong>{profile?.full_name}</strong> <span style={{fontSize:'0.7rem', background:'#ffb300', padding:'2px 6px', borderRadius:'10px'}}>{profile?.license_type}</span></p>
                    <p style={{fontSize:'0.8rem', color:'#666'}}>{myClub?.name || profile?.stable || 'Bez stáje'}</p>
                    <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit profil</button><button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={styles.btnSignOut}>Odhlásit</button>
                  </div>
                )}
                {renderGlobalCalendar()}
              </>
            )}

            {sidebarTab === 'tym' && (
              <div>
                {userRole === 'owner' && (
                  <><h4 style={{margin: '0 0 10px 0', color: '#5d4037'}}>Přidat člena týmu</h4>
                    <form onSubmit={handleInviteMember} style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', background: '#fafafa', padding: '10px', borderRadius: '8px'}}>
                      <label style={styles.formLabel}>Zadejte e-mail nového člena:</label><input type="email" placeholder="E-mail člena" value={inviteNewEmail} onChange={e => setInviteNewEmail(e.target.value)} style={styles.inputSmall} required />
                      <label style={styles.formLabel}>Vyberte jeho roli:</label>
                      <select value={inviteNewRole} onChange={e => setInviteNewRole(e.target.value)} style={styles.inputSmall}><option value="trainer">Trenér</option><option value="collaborator">Spolupracovník (Tréninky, péče)</option><option value="farrier">Kovář</option><option value="vet">Veterinář</option></select>
                      <button type="submit" style={{...styles.btnSave, background: '#4caf50'}}>Vygenerovat odkaz</button>
                    </form></>
                )}
                <h4 style={{margin: '0 0 10px 0', color: '#5d4037', borderBottom: '1px solid #ddd', paddingBottom: '5px'}}>Členové stáje</h4>
                <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                  {teamMembers.map(member => {
                    const roleNames = { 'owner': 'Majitel', 'collaborator': 'Spoluprac.', 'trainer': 'Trenér', 'farrier': 'Kovář', 'vet': 'Veterinář' };
                    return (
                    <li key={member.id} style={{fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between'}}>
                      <span><strong>{member.profiles?.full_name || 'Nováček'}</strong><br/><span style={{color: '#666', fontSize: '0.75rem'}}>{member.profiles?.email}</span></span>
                      <span style={{background: member.role === 'owner' ? '#ffb300' : '#e0e0e0', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', height: 'max-content'}}>{roleNames[member.role] || member.role}</span>
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
                  <h3 style={{ margin: 0, color: '#3e2723' }}>Moje koně ({myClub?.name || 'Moje osobní sekce'})</h3>
                  {(userRole === 'owner' || userRole === 'collaborator') && <button onClick={() => { setIsEditingHorse(true); setCurrentHorseId(null); }} style={styles.btnAdd}>+ Nový kůň</button>}
                </div>

                <div style={styles.horseList}>
                  {myHorses.map(h => {
                    const vacS = getHealthStatus(h.vaccination_date); const farS = getHealthStatus(h.farrier_date); const isD = expandedDiaryId === h.id;
                    const horseLogs = allDiaryLogs.filter(l => l.horse_id === h.id); const totalSpent = horseLogs.reduce((acc, l) => acc + (l.cost || 0), 0);

                    return (
                      <div key={h.id} style={{...styles.horseCard, borderLeft: `6px solid ${getHorseColor(h.id)}`}}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                          <img src={h.photo_url || 'https://via.placeholder.com/80?text=KŮŇ'} style={{width:'60px', height:'60px', borderRadius:'50%', objectFit:'cover', border:`2px solid ${getHorseColor(h.id)}`}} />
                          <div style={{flex:1}}><h4 style={{margin:0}}>{h.name}</h4><small>{h.birth_year}</small></div>
                          {(userRole === 'owner' || userRole === 'collaborator') && <><button onClick={() => editHorse(h)} style={styles.btnIconEdit}>✏️</button><button onClick={() => deleteHorse(h.id, h.name)} style={styles.btnIconDelete}>🗑️</button></>}
                        </div>
                        
                        {(userRole === 'owner' || userRole === 'collaborator' || userRole === 'farrier' || userRole === 'vet') && (
                          <div style={{background: '#fcfcfc', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #eee'}}>
                            <div style={{...styles.infoRow, borderBottom: 'none', paddingBottom: 0}}><span>💉 Očkování: <span style={{color:vacS.color}}>{h.vaccination_date ? new Date(h.vaccination_date).toLocaleDateString() : 'Nenastaveno'}</span></span>{h.vaccination_date && <a href={createGCalLink(`Očkování - ${h.name}`, h.vaccination_date)} target="_blank" rel="noopener noreferrer" style={styles.gcalLink}>📅 Do Googlu</a>}</div>
                            <div style={{...styles.infoRow, borderBottom: 'none'}}><span>⚒️ Kovář: <span style={{color:farS.color}}>{h.farrier_date ? new Date(h.farrier_date).toLocaleDateString() : 'Nenastaveno'}</span></span>{h.farrier_date && <a href={createGCalLink(`Kovář - ${h.name}`, h.farrier_date)} target="_blank" rel="noopener noreferrer" style={styles.gcalLink}>📅 Do Googlu</a>}</div>
                          </div>
                        )}
                        
                        <button onClick={() => toggleDiary(h.id)} style={{...styles.btnOutline, width:'100%', marginTop:'5px', background: isD ? '#f5f5f5' : 'transparent'}}>{isD ? '📖 Zavřít deník' : '📖 Otevřít deník tréninků'}</button>

                        {isD && (
                          <div style={{marginTop:'15px', background:'#f9f9f9', padding:'15px', borderRadius:'8px', border: '1px solid #eee'}}>
                            {(userRole === 'owner' || userRole === 'collaborator') && <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', fontWeight:'bold', color:'#2e7d32', fontSize: '1.1rem'}}><span>Roční výdaje na koně:</span> <span>{totalSpent.toLocaleString('cs-CZ')} Kč</span></div>}
                            
                            <h5 style={{margin: '0 0 10px 0', color: '#0288d1', fontSize: '1rem'}}>Záznam pro {new Date(newLog.date).toLocaleDateString('cs-CZ')}</h5>
                            <form onSubmit={(e) => saveDiaryLog(e, h.id)} style={{display:'grid', gap:'8px', gridTemplateColumns:'1fr 1fr', marginBottom:'25px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e3f2fd'}}>
                              <div style={{gridColumn: 'span 2'}}><label style={styles.formLabel}>Záznam pro datum:</label><input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} /></div>
                              <div style={{gridColumn: 'span 2'}}>
                                <label style={styles.formLabel}>Typ události:</label>
                                <select value={newLog.type} onChange={e=>setNewLog({...newLog, type:e.target.value})} style={{...styles.inputSmall, background: getTypeColor(newLog.type), color: ['Odpočinek'].includes(newLog.type) ? '#000' : '#fff'}}><option value="Jízdárna">Jízdárna</option><option value="Lonž">Lonž</option><option value="Terén">Terén</option><option value="Skoky">Skoky</option><option value="Odpočinek">Odpočinek</option>{(userRole === 'owner' || userRole === 'collaborator' || userRole === 'vet' || userRole === 'farrier') && <><option value="Veterinář">Veterinář / Zuby / Fyzio</option><option value="Kovář">Kovář</option></>}</select>
                              </div>
                              {(userRole === 'owner' || userRole === 'collaborator') && <div style={{gridColumn: 'span 1'}}><label style={styles.formLabel}>Náklady (Kč):</label><input type="number" placeholder="0" value={newLog.cost || ''} onChange={e=>setNewLog({...newLog, cost:parseInt(e.target.value)||0})} style={styles.inputSmall} /></div>}
                              <div style={{gridColumn: (userRole === 'owner' || userRole === 'collaborator') ? 'span 1' : 'span 2'}}><label style={styles.formLabel}>Jak to šlo?</label><select value={newLog.rating} onChange={e=>setNewLog({...newLog, rating:parseInt(e.target.value)})} style={styles.inputSmall}><option value="0">Bez hodnocení</option><option value="5">⭐⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="1">⭐</option></select></div>
                              <div style={{gridColumn:'span 2'}}><label style={styles.formLabel}>Příloha / Zpráva (JPG, PDF):</label><input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{...styles.inputSmall, background: '#fff'}} /></div>
                              <div style={{gridColumn:'span 2'}}><label style={styles.formLabel}>Poznámky k tréninku:</label><textarea placeholder="Co se dělalo..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{...styles.inputSmall, height: '60px'}} /></div>
                              <button type="submit" style={{gridColumn:'span 2', background:'#0288d1', color:'#fff', border:'none', padding:'12px', borderRadius:'6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'}}>Uložit záznam</button>
                            </form>

                            <h4 style={{margin: '15px 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#5d4037'}}>Historie záznamů</h4>
                            {horseLogs.length === 0 ? <p style={{fontSize: '0.85rem', color: '#888'}}>Žádné záznamy.</p> : horseLogs.map(log => (
                              <div key={log.id} style={{fontSize:'0.85rem', padding:'12px', borderLeft:`4px solid ${getTypeColor(log.training_type)}`, background: '#fff', marginBottom: '10px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}><strong style={{fontSize: '1rem', color: '#333'}}>{new Date(log.date).toLocaleDateString()} - {log.training_type}</strong><button onClick={() => deleteDiaryLog(log.id)} style={{background:'none', border:'none', color:'#e57373', cursor:'pointer', fontSize:'0.8rem'}}>Smazat</button></div>
                                {log.rating > 0 && <div style={{marginBottom: '5px', fontSize: '1.1rem'}}>{'⭐'.repeat(log.rating)}</div>}
                                <div style={{color:'#555', whiteSpace: 'pre-wrap', lineHeight: '1.4'}}>{log.notes}</div>
                                <div style={{display: 'flex', gap: '15px', marginTop: '8px', borderTop: '1px dashed #eee', paddingTop: '8px'}}>
                                  {(userRole === 'owner' || userRole === 'collaborator') && log.cost > 0 && <span style={{color:'#2e7d32', fontWeight:'bold'}}>💰 {log.cost} Kč</span>}
                                  {log.attachment_url && <a href={log.attachment_url} target="_blank" rel="noopener noreferrer" style={{color:'#0288d1', fontWeight: 'bold', textDecoration: 'none'}}>📎 Příloha</a>}
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

              {isEditingHorse && (userRole === 'owner' || userRole === 'collaborator') && (
                <div style={styles.formCard}>
                  <h3 style={{marginTop: 0, color: '#5d4037'}}>{currentHorseId ? 'Upravit kartu koně' : 'Nová karta koně'}</h3>
                  <form onSubmit={handleSaveHorse} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <div style={{background: '#e3f2fd', padding: '10px', borderRadius: '8px', border: '1px solid #90caf9'}}><label style={{...styles.formLabel, color: '#0288d1'}}>Profilová fotka (JPG/PNG)</label><input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={{...styles.inputSmall, background: '#fff', marginTop: '5px'}} /></div>
                    <div style={styles.formGroup}><label style={styles.formLabel}>Jméno koně *</label><input placeholder="Zadejte jméno koně" value={horseData.name} onChange={e=>setHorseData({...horseData, name:e.target.value})} style={styles.input} required /></div>
                    <div style={{display: 'flex', gap: '10px'}}><div style={{...styles.formGroup, flex: 1}}><label style={styles.formLabel}>Rok narození</label><input type="number" placeholder="Např. 2018" value={horseData.birth_year} onChange={e=>setHorseData({...horseData, birth_year:e.target.value})} style={styles.input} /></div><div style={{...styles.formGroup, flex: 1}}><label style={styles.formLabel}>ID / Průkaz</label><input placeholder="Číslo průkazu" value={horseData.horse_id_number} onChange={e=>setHorseData({...horseData, horse_id_number:e.target.value})} style={styles.input} /></div></div>
                    <h4 style={{margin: '10px 0 0 0', color: '#5d4037'}}>Zdraví a Očkování</h4>
                    <div style={{display: 'flex', gap: '10px'}}><div style={{...styles.formGroup, flex: 1}}><label style={styles.formLabel}>Platnost očkování do:</label><input type="date" value={horseData.vaccination_date} onChange={e=>setHorseData({...horseData, vaccination_date:e.target.value})} style={styles.input} /></div><div style={{...styles.formGroup, flex: 1}}><label style={styles.formLabel}>Další kovář v termínu:</label><input type="date" value={horseData.farrier_date} onChange={e=>setHorseData({...horseData, farrier_date:e.target.value})} style={styles.input} /></div></div>
                    <div style={styles.formGroup}><label style={styles.formLabel}>Krmná dávka / Poznámky ke koni:</label><textarea placeholder="Dieta, alergie, dávky..." value={horseData.diet_notes} onChange={e=>setHorseData({...horseData, diet_notes:e.target.value})} style={{...styles.input, height: '60px'}} /></div>
                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}><button type="submit" style={{...styles.btnPrimary, flex: 2, margin: 0}}>Uložit kartu koně</button><button type="button" onClick={resetHorseForm} style={{...styles.btnOutline, flex: 1, margin: 0}}>Zrušit</button></div>
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
  btnCalNavSmall: { background: '#eee', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#333', fontSize: '0.8rem' },
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
