/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

// NASTAVENÍ EXTERNÍ KOMUNIKACE
const TELEGRAM_BOT_TOKEN = '8105813575:AAGk9YXZJQtRrS_73gKg-ApYn98gjG8BH1w';
const TELEGRAM_CHAT_ID = '-1003892130465';

const sendTelegramMessage = async (text) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Chyba pri odesilani:', err);
  }
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data z databaze
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  
  // Stavy pro hrace
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  // Stavy pro Admina
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  // Stavy pro Rozhodciho a Spikra
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));

  // Prepinac roli a tisku
  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) setEvents(evts);

      if (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'judge' || profile?.role === 'speaker') {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*');
        if (scores) setScoresheets(scores);
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [profile]);

  const logSystemAction = async (actionDesc, detailData = {}) => {
    if (!user) return;
    await supabase.from('system_logs').insert([{
      user_id: user.id,
      action: actionDesc,
      details: detailData
    }]);
  };

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', user.id);
        setMyHorses(horses || []);

        const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        setEvents(evts || []);

        const { data: prices } = await supabase.from('pricing').select('*').order('id');
        setPricing(prices || []);

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);

          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        } else {
          const { data: regs } = await supabase.from('race_participants').select('*').eq('user_id', user.id);
          setAllRegistrations(regs || []);

          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        }

        if (prof?.role === 'superadmin') {
          const { data: logs } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
          setSystemLogs(logs || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await logSystemAction('Odhlaseni uzivatele');
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        alert('Registrace uspesna! Muzete vstoupit.');
        window.location.reload();
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        await supabase.from('system_logs').insert([{ user_id: data.user.id, action: 'Prihlaseni', details: { email } }]);
        window.location.reload();
      }
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      email: profile.email || user.email,
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { 
      await logSystemAction('Uprava profilu', { name: profile.full_name });
      alert('Profil ulozen!'); 
      setEditMode(false); 
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode('');
    }, 500); 
  };

  const handleUpdateSpeakerMessage = async (eventId, currentMessage) => {
    const msg = prompt("Zadejte rychly vzkaz POUZE pro hlasatele. Smazanim textu vzkaz zrusite:", currentMessage || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ speaker_message: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else {
        await logSystemAction('Zmena interni zpravy', { msg });
        checkUser(); 
      }
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ 
      name: newEventName, 
      event_date: newEventDate, 
      start_num_from: parseInt(newStartNumFrom),
      start_num_to: parseInt(newStartNumTo)
    }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Vypsan novy zavod', { name: newEventName, from: newStartNumFrom, to: newStartNumTo });
      
      const tgMsg = `🎉 <b>NOVE ZAVODY VYPSANY!</b>\n\n` +
                    `🏆 <b>Nazev:</b> ${newEventName}\n` +
                    `📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\n` +
                    `Prihlasky byly prave otevreny. Tesime se na vas pod Humprechtem! 🤠`;
      await sendTelegramMessage(tgMsg);

      alert('Zavod vytvoren a oznameni odeslano!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Opravdu chcete zavod znovu otevrit pro prihlasky?' : 'Opravdu chcete uzamknout prihlasky?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction(currentLocked ? 'Odemcen zavod' : 'Uzamcen zavod', { event: eventName });
        window.location.reload();
      }
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice) }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Nova disciplina v ceniku', { discipline: newDiscName, price: newDiscPrice });
      alert('Disciplina pridana do ceniku!'); 
      window.location.reload(); 
    }
  };

  const handleEditPrice = async (id, oldPrice, discName) => {
    const newPrice = prompt(`Zadejte novou cenu pro ${discName}:`, oldPrice);
    if (newPrice !== null && newPrice !== "") {
      const { error } = await supabase.from('pricing').update({ price: parseInt(newPrice) }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Zmena ceny discipliny', { discipline: discName, oldPrice, newPrice });
        window.location.reload();
      }
    }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu chcete smazat disciplinu ${discName} z ceniku?`)) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Smazana disciplina z ceniku', { discipline: discName });
        window.location.reload();
      }
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    await logSystemAction('Uprava poznamky k platbe', { rider: riderName, note });
    alert('Poznamka k platbe ulozena!');
  };

  const handleUpdateSchedule = async (eventId, currentSchedule) => {
    const msg = prompt("Zadejte textovy plan zavodu. Tento plan se ukaze vsem:", currentSchedule || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ schedule: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else {
        await logSystemAction('Zmena planu zavodu', { schedule: msg });
        alert('Plan byl ulozen!');
        checkUser();
      }
    }
  };

  const sendManualTgMessage = async () => {
    if(!manualTgMessage) return;
    await sendTelegramMessage(`📢 <b>INFORMACE OD PORADATELE:</b>\n\n${manualTgMessage}`);
    alert('Odeslano!');
    setManualTgMessage('');
  };

  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city) {
      alert("Nez se prihlasite na zavod, musite mit kompletne vyplneny profil! Prosim, upravte si udaje v levem panelu.");
      return;
    }

    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0) {
      alert("Vyberte zavod, kone a aspon jednu disciplinu.");
      return;
    }

    let finalHorseName = selectedHorse;

    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napiste jmeno noveho kone!");
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName }])
        .select().single();
      if (horseErr) return alert("Chyba pri ukladani kone: " + horseErr.message);
      finalHorseName = newHorse.name;
    }

    const selectedEventObj = events.find(e => e.id === selectedEvent);
    const fromNum = selectedEventObj?.start_num_from || 1;
    const toNum = selectedEventObj?.start_num_to || 200;
    const capacity = toNum - fromNum + 1;

    const { data: takenNumbers } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const taken = takenNumbers?.map(t => t.start_number) || [];
    const available = Array.from({ length: capacity }, (_, i) => i + fromNum).filter(n => !taken.includes(n));

    if (available.length === 0) {
      alert("Kapacita cisel pro tento zavod je vycerpana!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    const registrationData = await Promise.all(selectedDisciplines.map(async (d) => {
      const { data: takenDraws } = await supabase.from('race_participants')
        .select('draw_order')
        .eq('event_id', selectedEvent)
        .eq('discipline', d.discipline_name);
        
      const takenDrawOrders = takenDraws?.map(t => t.draw_order) || [];
      const availableDraws = Array.from({ length: capacity }, (_, i) => i + 1).filter(n => !takenDrawOrders.includes(n));
      const assignedDraw = availableDraws[Math.floor(Math.random() * availableDraws.length)];

      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: profile?.full_name || user.email,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: assignedDraw,
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      await logSystemAction('Odeslana prihlaska na zavod', { horse: finalHorseName, disciplines: selectedDisciplines.map(d=>d.discipline_name) });
      alert(`Prihlaska odeslana! Vase startovni cislo na zada je: ${assignedNumber}.`);
      window.location.reload();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrusit tuto prihlasku?")) {
      const { error } = await supabase.from('race_participants').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Hrac zrusil prihlasku', { registration_id: id });
        alert('Prihlaska byla zrusena.');
        window.location.reload();
      }
    }
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznamit konec discipliny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLINA UZAVRENA</b>\n\nPrave bylo dokonceno hodnoceni discipliny <b>${discName}</b>. Dekujeme jezdcum!`);
        alert('Odeslano!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(0));
    } else {
      setManeuverScores(Array(10).fill(0));
      setPenaltyScores(Array(10).fill(0));
    }
  };

  const handleManeuverChange = (index, value) => {
    const newScores = [...maneuverScores];
    newScores[index] = parseFloat(value);
    setManeuverScores(newScores);
  };

  const handlePenaltyChange = (index, value) => {
    const newPenalties = [...penaltyScores];
    newPenalties[index] = parseFloat(value) || 0;
    setPenaltyScores(newPenalties);
  };

  const calculateTotalScore = () => {
    const baseScore = 70;
    const maneuversTotal = maneuverScores.reduce((acc, val) => acc + val, 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => acc + val, 0);
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    
    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      score_data: scoreData,
      total_score: total
    });

    if (error) {
      alert('Chyba pri ukladani: ' + error.message);
    } else {
      await logSystemAction('Ulozeno hodnoceni', { rider: evaluatingParticipant.rider_name, total });
      alert('Hodnoceni bylo uspesne ulozeno!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  if (loading) return <div style={styles.loader}>Nacitam Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))] : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  const lockedEvent = events.find(ev => ev.is_locked);
  const speakerEventId = lockedEvent?.id;
  const speakerDiscipline = lockedEvent?.active_discipline;
  const speakerStartList = speakerEventId && speakerDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  return (
    <div style={styles.container}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; margin: 0; padding: 0; font-size: 12pt; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; max-width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .print-border { border: 2px solid black !important; padding: 15px !important; margin-bottom: 20px !important; border-radius: 0 !important; page-break-inside: avoid; }
          .page-break { page-break-after: always; }
          table { width: 100% !important; border-collapse: collapse; table-layout: auto; margin-top: 10px; }
          th, td { border: 1px solid black !important; padding: 8px !important; color: black !important; text-align: left; }
          th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
          input, select { border: none !important; appearance: none !important; font-weight: bold; background: transparent !important; }
        }
      `}</style>

      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="no-print" style={styles.superAdminBar}>
          <strong>{profile?.role === 'superadmin' ? 'SUPERADMIN:' : 'ADMIN:'}</strong> 
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('superadmin')} style={effectiveRole === 'superadmin' ? styles.activeTab : styles.tab}>Superadmin</button>
          )}
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin Pohled</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Rozhodci Pohled</button>
          )}
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('speaker')} style={effectiveRole === 'speaker' ? styles.activeTab : styles.tab}>Spikr</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hrac Pohled</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernove hobby zavody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>{isSignUp ? 'Nova registrace' : 'Prihlaseni'}</h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
            {isSignUp ? 'Uz mate ucet? Prihlaste se zde.' : 'Nemate ucet? Zaregistrujte se zde.'}
          </button>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          <div className="no-print" style={styles.sideCard}>
            <h3>Muj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jmeno a prijmeni" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} type="email" placeholder="Email" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Cislo hospodarstvi" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} required/>
                <button type="submit" style={styles.btnSave}>Ulozit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px'}}>Zrusit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplnene jmeno'}</strong></p>
                <p>E-mail: {profile?.email || user?.email}</p>
                <p>Hospodarstvi: {profile?.stable || 'Nevyplneno'}</p>
                {( !profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city ) && (
                  <p style={{color: '#e57373', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Profil neni kompletni.</p>
                )}
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit udaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlasit se</button>
              </div>
            )}
          </div>

          <div className="print-area" style={styles.card}>
            
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div className="no-print" style={{marginBottom: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>
                  <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px'}}>
                    <button onClick={() => setAdminSelectedEvent('')} style={!adminSelectedEvent ? styles.activeTab : styles.tab}>Nastaveni Zavodu</button>
                    <button onClick={() => setAdminSelectedEvent('telegram')} style={adminSelectedEvent === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Komunikacni Kanal</button>
                    {events.map(ev => (
                      <button key={ev.id} onClick={() => setAdminSelectedEvent(ev.id)} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                        Detail: {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!adminSelectedEvent && (
                  <div className="no-print">
                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Terminy zavodu</h4>
                      <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Nazev" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <span>Cisla od:</span>
                          <input type="number" value={newStartNumFrom} onChange={e => setNewStartNumFrom(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                          <span>do:</span>
                          <input type="number" value={newStartNumTo} onChange={e => setNewStartNumTo(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                        </div>
                        <button type="submit" style={styles.btnSave}>Vypsat zavod</button>
                      </form>
                      <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#eee', textAlign: 'left'}}>
                            <th style={{padding: '8px'}}>Nazev</th>
                            <th style={{padding: '8px'}}>Datum</th>
                            <th style={{padding: '8px'}}>Rozsah cisel</th>
                            <th style={{padding: '8px'}}>Stav</th>
                            <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(ev => (
                            <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                              <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                              <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString()}</td>
                              <td style={{padding: '8px'}}>{ev.start_num_from || 1} - {ev.start_num_to || 200}</td>
                              <td style={{padding: '8px', color: ev.is_locked ? '#e65100' : '#2e7d32', fontWeight: 'bold'}}>
                                {ev.is_locked ? 'Uzamceno' : 'Otevreno'}
                              </td>
                              <td style={{padding: '8px', textAlign: 'center'}}>
                                <button onClick={() => toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}>
                                  {ev.is_locked ? 'Odemknout' : 'Uzamknout'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Cenik disciplin</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Nova disciplina..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                        <button type="submit" style={styles.btnSave}>Pridat</button>
                      </form>

                      <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                        <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                          <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                            <tr style={{textAlign: 'left'}}>
                              <th style={{padding: '10px'}}>Disciplina</th>
                              <th style={{padding: '10px', width: '80px'}}>Cena</th>
                              <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map(p => (
                              <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '10px'}}>{p.discipline_name}</td>
                                <td style={{padding: '10px'}}><strong>{p.price} Kc</strong></td>
                                <td style={{padding: '10px', textAlign: 'center'}}>
                                  <button onClick={() => handleEditPrice(p.id, p.price, p.discipline_name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>Edit</button>
                                  <button onClick={() => handleDeletePricing(p.id, p.discipline_name)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Smazat</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminSelectedEvent === 'telegram' && (
                  <div className="no-print">
                    <div style={{background: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1', textAlign: 'center'}}>
                      <h3 style={{color: '#0288d1', marginTop: 0}}>📢 Manualni odeslani zpravy do kanalu</h3>
                      <p>Tato zprava se rozesle vsem sledujicim.</p>
                      <input type="text" placeholder="Napiste vzkaz pro jezdce..." value={manualTgMessage} onChange={e => setManualTgMessage(e.target.value)} style={{...styles.input, fontSize: '1.1rem', padding: '15px'}} />
                      <button onClick={sendManualTgMessage} style={{...styles.btnSave, background: '#0288d1', padding: '15px 30px', fontSize: '1.1rem', marginTop: '10px'}}>Odeslat Zpravu Nyni</button>
                    </div>
                  </div>
                )}

                {adminSelectedEvent && adminSelectedEvent !== 'telegram' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interni vzkaz pro Spikra:</strong>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === adminSelectedEvent)?.speaker_message || 'Zadna zprava'}</span>
                      </div>
                      <button onClick={() => handleUpdateSpeakerMessage(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plan zavodu:</strong>
                        <span style={{fontSize: '1rem'}}>{events.find(e => e.id === adminSelectedEvent)?.schedule || 'Plan nebyl zadan'}</span>
                      </div>
                      <button onClick={() => handleUpdateSchedule(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.schedule)} style={{...styles.btnOutline, margin: 0}}>Upravit plan</button>
                    </div>

                    <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 className="no-print" style={{margin: 0}}>Kompletni startovni listina</h4>
                        <h2 style={{display: 'none', margin: '0 0 20px 0', textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px'}} className="print-only">Startovni listina: {events.find(e => e.id === adminSelectedEvent)?.name}</h2>
                        <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                      </div>
                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#eee', textAlign: 'left'}}>
                              <th style={{padding: '8px', width: '60px'}}>Zada</th>
                              <th style={{padding: '8px', width: '60px'}}>Draw</th>
                              <th style={{padding: '8px'}}>Jezdec</th>
                              <th style={{padding: '8px'}}>Kun</th>
                              <th style={{padding: '8px'}}>Disciplina</th>
                              <th className="no-print" style={{padding: '8px'}}>Poznamka k platbe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRegistrations.filter(r => r.event_id === adminSelectedEvent).map((r, i) => (
                              <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                <td style={{padding: '8px'}}><strong>{r.draw_order || '-'}</strong></td>
                                <td style={{padding: '8px'}}>{r.rider_name}</td>
                                <td style={{padding: '8px'}}>{r.horse_name}</td>
                                <td style={{padding: '8px'}}>{r.discipline}</td>
                                <td className="no-print" style={{padding: '8px'}}>
                                  <input 
                                    type="text" 
                                    defaultValue={r.payment_note || ''} 
                                    onBlur={(e) => updatePaymentNote(r.id, e.target.value, r.rider_name)} 
                                    placeholder="např. Hotove"
                                    style={{padding: '5px', width: '100px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Scoresheety</button>
                      </div>
                      
                      <div className="print-area">
                        {events.find(e => e.id === adminSelectedEvent) && [...new Set(allRegistrations.filter(r => r.event_id === adminSelectedEvent).map(r => r.discipline))].map(discipline => {
                          const ridersInDiscipline = allRegistrations.filter(r => r.event_id === adminSelectedEvent && r.discipline === discipline).sort((a, b) => a.draw_order - b.draw_order);
                          if(ridersInDiscipline.length === 0) return null;
                          
                          return (
                            <div key={discipline} className="page-break" style={{marginBottom: '30px'}}>
                              <h2 style={{textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', textTransform: 'uppercase'}}>{events.find(e => e.id === adminSelectedEvent)?.name} - {discipline}</h2>
                              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                                <thead>
                                  <tr>
                                    <th style={{border: '1px solid black', padding: '8px', width: '50px'}}>Draw</th>
                                    <th style={{border: '1px solid black', padding: '8px', width: '50px'}}>Zada</th>
                                    <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Jezdec / Kun</th>
                                    <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Manevry (Skore)</th>
                                    <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Penalty</th>
                                    <th style={{border: '1px solid black', padding: '8px', width: '80px'}}>Celkem</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ridersInDiscipline.map(r => {
                                    const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                    return (
                                      <tr key={r.id}>
                                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{r.draw_order}</td>
                                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'}}>{r.start_number}</td>
                                        <td style={{border: '1px solid black', padding: '12px'}}><strong>{r.rider_name}</strong><br/>{r.horse_name}</td>
                                        <td style={{border: '1px solid black', padding: '12px'}}>
                                          {scoreObj ? scoreObj.score_data.maneuvers.map(m => m !== 0 ? (m > 0 ? '+'+m : m) : '0').join(' | ') : ''}
                                        </td>
                                        <td style={{border: '1px solid black', padding: '12px', color: 'red', fontWeight: 'bold'}}>
                                          {scoreObj ? scoreObj.score_data.penalties.map(p => p !== 0 ? '-'+p : '').filter(Boolean).join(' | ') : ''}
                                        </td>
                                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'}}>
                                          {scoreObj ? scoreObj.total_score : ''}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {effectiveRole === 'superadmin' && !adminSelectedEvent && (
                  <div className="no-print" style={{...styles.adminSection, border: '2px solid #000', background: '#e0e0e0', marginTop: '20px'}}>
                    <h4 style={{margin: '0 0 10px 0'}}>Logy systemu</h4>
                    <div style={{maxHeight: '300px', overflowY: 'auto', background: '#fff', padding: '10px'}}>
                      {systemLogs.length === 0 ? <p>Zadne zaznamy.</p> : (
                        <ul style={{listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem'}}>
                          {systemLogs.map(log => (
                            <li key={log.id} style={{borderBottom: '1px solid #eee', padding: '8px 0'}}>
                              <span style={{color: '#888'}}>{new Date(log.created_at).toLocaleString('cs-CZ')}</span> - 
                              <strong style={{marginLeft: '10px'}}>{log.action}</strong>
                              <div style={{color: '#555', marginTop: '4px', fontSize: '0.8rem'}}>{JSON.stringify(log.details)}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POHLED: ROZHODCI */}
            {effectiveRole === 'judge' && (
              <div className="print-area">
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd'}}>Rozhodci panel</h3>
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div>
                      <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interni vzkaz pro Spikra:</strong>
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === judgeEvent)?.speaker_message || 'Zadna zprava'}</span>
                    </div>
                    <button onClick={() => handleUpdateSpeakerMessage(judgeEvent, events.find(e => e.id === judgeEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                  </div>
                )}
                
                {evaluatingParticipant ? (
                  <div className="print-border print-area" style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <h2 style={{marginTop: 0}}>{evaluatingParticipant.discipline}</h2>
                      <h2 style={{marginTop: 0}}>Startovni cislo: {evaluatingParticipant.start_number}</h2>
                    </div>
                    <p style={{fontSize: '1.2rem', marginBottom: '30px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kun: <strong>{evaluatingParticipant.horse_name}</strong></p>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                      <div>
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manevry (Skore)</h4>
                        {maneuverScores.map((score, index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                            <strong>Manevr {index + 1}</strong>
                            <select className="no-print" value={score} onChange={(e) => handleManeuverChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}>
                              <option value="1.5">+1.5 (Excellent)</option>
                              <option value="1.0">+1.0 (Very Good)</option>
                              <option value="0.5">+0.5 (Good)</option>
                              <option value="0">0 (Average)</option>
                              <option value="-0.5">-0.5 (Poor)</option>
                              <option value="-1.0">-1.0 (Very Poor)</option>
                              <option value="-1.5">-1.5 (Extremely Poor)</option>
                            </select>
                            <span style={{display: 'none'}} className="print-only">{score > 0 ? `+${score}` : score}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestne body)</h4>
                        {penaltyScores.map((penalty, index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                            <strong>U manevru {index + 1}</strong>
                            <input 
                              className="no-print"
                              type="number" 
                              min="0" 
                              step="0.5" 
                              value={penalty} 
                              onChange={(e) => handlePenaltyChange(index, e.target.value)} 
                              style={{padding: '5px', width: '60px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center'}}
                            />
                            <span style={{display: 'none'}} className="print-only">-{penalty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{marginTop: '30px', padding: '15px', background: '#e1f5fe', borderRadius: '8px', textAlign: 'right', border: '2px solid black'}}>
                      <span style={{fontSize: '1.2rem', color: '#000'}}>Zaklad: 70 | </span>
                      <strong style={{fontSize: '1.5rem', color: '#000'}}>CELKOVE SKORE: {calculateTotalScore()}</strong>
                    </div>

                    <div className="no-print" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                      <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Ulozit hodnoceni</button>
                      <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 1, marginTop: 0}}>Zpet na listinu</button>
                    </div>
                  </div>
                ) : (
                  <div className="no-print">
                    <label style={styles.label}>Vyberte uzamceny zavod k hodnoceni:</label>
                    <select style={styles.input} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                      <option value="">-- Zvolte zavod --</option>
                      {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>

                    {judgeEvent && (
                      <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                          <div style={{flex: 1}}>
                            <label style={styles.label}>Vyberte disciplinu (Zrcadli se Spikrovi):</label>
                            <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                              <option value="">-- Zvolte disciplinu --</option>
                              {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {judgeEvent && judgeDiscipline && (
                      <div style={{marginTop: '20px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <h4>Startovni poradi: {judgeDiscipline}</h4>
                          <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0, padding: '5px 10px'}}>📣 Oznamit konec discipliny navenek</button>
                        </div>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                              <th style={{padding: '10px'}}>Draw</th>
                              <th style={{padding: '10px'}}>Zada</th>
                              <th style={{padding: '10px'}}>Jezdec</th>
                              <th style={{padding: '10px'}}>Kun</th>
                              <th style={{padding: '10px', textAlign: 'center'}}>Stav</th>
                            </tr>
                          </thead>
                          <tbody>
                            {judgeStartList.length > 0 ? judgeStartList.map(r => {
                              const isScored = scoresheets.some(s => s.participant_id === r.id);
                              const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                              
                              return (
                                <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                  <td style={{padding: '10px', fontWeight: 'bold', color: '#0277bd', fontSize: '1.1rem'}}>{r.draw_order}</td>
                                  <td style={{padding: '10px', fontWeight: 'bold'}}>{r.start_number}</td>
                                  <td style={{padding: '10px'}}>{r.rider_name}</td>
                                  <td style={{padding: '10px'}}>{r.horse_name}</td>
                                  <td style={{padding: '10px', textAlign: 'center'}}>
                                    {isScored ? (
                                      <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '5px 10px', border: '1px solid #4caf50', color: '#4caf50'}}>Opravit ({scoreObj.total_score})</button>
                                    ) : (
                                      <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd'}}>Hodnotit</button>
                                    )}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan="5" style={{padding: '15px', textAlign: 'center'}}>Zadni prihlaseni jezdci.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                {judgeEvent && (
                  <div className={printMode === 'scoresheets' ? 'print-area' : 'no-print'} style={{...styles.adminSection, marginTop: '30px'}}>
                    <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                      <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Mrizku</button>
                    </div>
                    
                    <div className="print-area">
                      {events.find(e => e.id === judgeEvent) && [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].map(discipline => {
                        const ridersInDiscipline = allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === discipline).sort((a, b) => a.draw_order - b.draw_order);
                        if(ridersInDiscipline.length === 0) return null;
                        
                        return (
                          <div key={discipline} className="page-break" style={{marginBottom: '30px'}}>
                            <h2 style={{textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', textTransform: 'uppercase'}}>{events.find(e => e.id === judgeEvent)?.name} - {discipline}</h2>
                            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                              <thead>
                                <tr>
                                  <th style={{border: '1px solid black', padding: '8px', width: '50px'}}>Draw</th>
                                  <th style={{border: '1px solid black', padding: '8px', width: '50px'}}>Zada</th>
                                  <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Jezdec / Kun</th>
                                  <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Manevry (Skore)</th>
                                  <th style={{border: '1px solid black', padding: '8px', textAlign: 'left'}}>Penalty</th>
                                  <th style={{border: '1px solid black', padding: '8px', width: '80px'}}>Celkem</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ridersInDiscipline.map(r => {
                                  const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                  return (
                                    <tr key={r.id}>
                                      <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold'}}>{r.draw_order}</td>
                                      <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'}}>{r.start_number}</td>
                                      <td style={{border: '1px solid black', padding: '12px'}}><strong>{r.rider_name}</strong><br/>{r.horse_name}</td>
                                      <td style={{border: '1px solid black', padding: '12px'}}>
                                        {scoreObj ? scoreObj.score_data.maneuvers.map(m => m !== 0 ? (m > 0 ? '+'+m : m) : '0').join(' | ') : ''}
                                      </td>
                                      <td style={{border: '1px solid black', padding: '12px', color: 'red', fontWeight: 'bold'}}>
                                        {scoreObj ? scoreObj.score_data.penalties.map(p => p !== 0 ? '-'+p : '').filter(Boolean).join(' | ') : ''}
                                      </td>
                                      <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'}}>
                                        {scoreObj ? scoreObj.total_score : ''}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POHLED: SPIKR */}
            {effectiveRole === 'speaker' && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#5d4037'}}>Pohled Hlasatele</h3>
                </div>
                
                {speakerEventId ? (
                  <div>
                    <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plan zavodu:</strong>
                      <span style={{fontSize: '1.2rem'}}>{lockedEvent?.schedule || 'Plan nebyl zadan'}</span>
                    </div>

                    {lockedEvent?.speaker_message && (
                      <div style={{background: '#ffe0b2', border: '4px solid #e65100', padding: '20px', borderRadius: '12px', marginTop: '10px', marginBottom: '30px', textAlign: 'center'}}>
                        <h3 style={{margin: '0 0 10px 0', color: '#e65100', textTransform: 'uppercase', letterSpacing: '2px'}}>🚨 Zprava od poradatele:</h3>
                        <p style={{fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#e65100'}}>
                          {lockedEvent?.speaker_message}
                        </p>
                      </div>
                    )}

                    {!speakerDiscipline ? (
                      <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '2px dashed #ccc'}}>
                        <h2>Ceka se na rozhodciho...</h2>
                        <p>Zde se automaticky zobrazi listina.</p>
                      </div>
                    ) : (
                      <div style={{marginTop: '30px'}}>
                        <h2 style={{fontSize: '2rem', textAlign: 'center', color: '#5d4037', borderBottom: '3px solid #5d4037', paddingBottom: '15px'}}>ARENA: {speakerDiscipline}</h2>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                          <thead>
                            <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                              <th style={{padding: '15px'}}>Draw</th>
                              <th style={{padding: '15px'}}>Cislo</th>
                              <th style={{padding: '15px'}}>Jezdec</th>
                              <th style={{padding: '15px'}}>Kun</th>
                              <th style={{padding: '15px', textAlign: 'right'}}>Skore</th>
                            </tr>
                          </thead>
                          <tbody>
                            {speakerStartList.length > 0 ? speakerStartList.map(r => {
                              const isScored = scoresheets.some(s => s.participant_id === r.id);
                              const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                              
                              return (
                                <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.5rem', background: isScored ? '#f1f8e9' : '#fff'}}>
                                  <td style={{padding: '15px', fontWeight: 'bold', color: '#5d4037'}}>{r.draw_order}.</td>
                                  <td style={{padding: '15px', fontWeight: '900', fontSize: '1.8rem'}}>{r.start_number}</td>
                                  <td style={{padding: '15px'}}>{r.rider_name}</td>
                                  <td style={{padding: '15px'}}><strong>{r.horse_name}</strong></td>
                                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                    {isScored ? `${scoreObj.total_score} bodu` : 'Na trati'}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', fontSize: '1.2rem'}}>Zadni prihlaseni jezdci.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>Aktualne neprobiha zadny uzamceny zavod.</p>
                )}
              </div>
            )}

            {/* POHLED: HRAC */}
            {effectiveRole === 'player' && (
              <div className="no-print">
                
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Zavody a Prihlasky</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Komunikacni Kanal</button>
                </div>

                {playerTab === 'telegram' && (
                  <div style={{background: '#e3f2fd', padding: '30px 20px', borderRadius: '8px', border: '1px solid #0288d1', textAlign: 'center', margin: '20px 0'}}>
                    <h2 style={{color: '#0288d1', marginTop: 0}}>📱 Sledujte hlaseni!</h2>
                    <p style={{fontSize: '1.1rem', color: '#333', marginBottom: '20px'}}>Pripojte se k aplikaci s modrou ikonkou a nic vam neutece.</p>
                    <a href="https://t.me/+xZ7MOtlAaX05YzA0" target="_blank" rel="noopener noreferrer" style={{...styles.btnSave, background: '#0288d1', textDecoration: 'none', display: 'inline-block', fontSize: '1.2rem', padding: '15px 30px'}}>Pridat se</a>
                  </div>
                )}

                {playerTab === 'main' && (
                  <div>
                    <h3 style={{marginTop: 0}}>Nova prihlaska k zavodu</h3>
                    
                    <label style={styles.label}>Vyberte zavod:</label>
                    <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                      <option value="">-- Ktery zavod pojedete? --</option>
                      {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString()})</option>)}
                    </select>

                    <label style={styles.label}>Vyberte kone:</label>
                    <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                      <option value="">-- Vyberte kone z historie --</option>
                      {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="new">+ Pridat noveho kone</option>
                    </select>
                    {selectedHorse === 'new' && (
                      <input type="text" placeholder="Napiste jmeno kone..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, border: '2px solid #8d6e63'}} />
                    )}

                    <label style={styles.label}>Discipliny:</label>
                    {pricing.length === 0 ? <p style={{color: 'red'}}>Cenik prazdny.</p> : (
                      <div style={styles.disciplineList}>
                        {pricing.map(d => (
                          <div key={d.id} onClick={() => {
                            const exists = selectedDisciplines.find(x => x.id === d.id);
                            setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                          }} style={{...styles.disciplineItem, background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                            {d.discipline_name} <strong>{d.price} Kc</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={styles.priceTag}>
                      Celkem k platbe: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kc
                    </div>

                    <button onClick={handleRaceRegistration} style={styles.btnSecondary}>ODESLAT PRIHLASKU</button>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Moje prihlasky</h3>
                        
                        {events.filter(e => allRegistrations.filter(r => r.user_id === user?.id).some(r => r.event_id === e.id) && e.schedule).map(ev => (
                          <div key={ev.id} style={{background: '#f5f5f5', padding: '10px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #8d6e63'}}>
                            <strong style={{color: '#5d4037'}}>Plan pro zavod {ev.name}:</strong><br/>
                            {ev.schedule}
                          </div>
                        ))}

                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                            <thead>
                              <tr style={{background: '#eee', textAlign: 'left'}}>
                                <th style={{padding: '8px'}}>Zavod</th>
                                <th style={{padding: '8px'}}>Kun</th>
                                <th style={{padding: '8px'}}>Disciplina</th>
                                <th style={{padding: '8px'}}>Zada</th>
                                <th style={{padding: '8px'}}>Skore</th>
                                <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                                const eventObj = events.find(e => e.id === r.event_id);
                                const eventName = eventObj?.name || 'Neznamy zavod';
                                const isEventLocked = eventObj?.is_locked || false;
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px'}}>{eventName}</td>
                                    <td style={{padding: '8px'}}>{r.horse_name}</td>
                                    <td style={{padding: '8px'}}>{r.discipline}</td>
                                    <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                    <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? '#2e7d32' : '#888'}}>
                                      {scoreObj ? scoreObj.total_score : 'Ceka se'}
                                    </td>
                                    <td style={{padding: '8px', textAlign: 'center'}}>
                                      {!isEventLocked ? (
                                        <button onClick={() => handleCancelRegistration(r.id)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Zrusit</button>
                                      ) : (
                                        <span style={{color: '#888', fontSize: '0.8rem'}}>Uzamceno</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  superAdminBar: { background: '#000', color: '#fff', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px', marginBottom: '20px', overflowX: 'auto' },
  tab: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  activeTab: { background: '#4caf50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  brandHeader: { textAlign: 'center', marginBottom: '20px' },
  logo: { width: '120px', borderRadius: '50%', border: '4px solid #5d4037' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', gap: '20px', maxWidth: '1100px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', margin: '0 auto', maxWidth: '100%', width: '100%' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' },
  adminSection: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  label: { fontSize: '0.9rem', fontWeight: 'bold', color: '#5d4037', display: 'block', marginTop: '15px' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '10px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #5d4037', color: '#0277bd', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', marginTop: '15px', display: 'block', width: '100%', textAlign: 'center' },
  disciplineList: { maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
