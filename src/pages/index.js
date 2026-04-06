/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data z databáze
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  
  // Stavy pro hráče
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [editMode, setEditMode] = useState(false);

  // Stavy pro Admina
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCapacity, setNewEventCapacity] = useState('200'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 

  // Stavy pro Rozhodčího
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));

  // Přepínač rolí a tisku
  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  useEffect(() => {
    checkUser();
  }, []);

  // FUNKCE PRO ZÁPIS DO LOGU
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

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge') {
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
    await logSystemAction('Odhlášení uživatele');
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
        alert('Registrace úspěšná! Můžete vstoupit.');
        window.location.reload();
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        await supabase.from('system_logs').insert([{ user_id: data.user.id, action: 'Přihlášení', details: { email } }]);
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
      await logSystemAction('Úprava profilu', { name: profile.full_name });
      alert('Profil uložen!'); 
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

  // ADMIN FUNKCE
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ name: newEventName, event_date: newEventDate, max_capacity: parseInt(newEventCapacity) }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Vypsán nový závod', { name: newEventName, capacity: newEventCapacity });
      alert('Závod vytvořen!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Opravdu chcete závod znovu otevřít pro přihlášky?' : 'Opravdu chcete uzamknout přihlášky a odeslat startku rozhodčímu?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction(currentLocked ? 'Odemčen závod' : 'Uzamčen závod', { event: eventName });
        window.location.reload();
      }
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice) }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Nová disciplína v ceníku', { discipline: newDiscName, price: newDiscPrice });
      alert('Disciplína přidána do ceníku!'); 
      window.location.reload(); 
    }
  };

  const handleEditPrice = async (id, oldPrice, discName) => {
    const newPrice = prompt(`Zadejte novou cenu v Kč pro ${discName}:`, oldPrice);
    if (newPrice !== null && newPrice !== "") {
      const { error } = await supabase.from('pricing').update({ price: parseInt(newPrice) }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Změna ceny disciplíny', { discipline: discName, oldPrice, newPrice });
        window.location.reload();
      }
    }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu chcete smazat disciplínu ${discName} z ceníku?`)) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Smazána disciplína z ceníku', { discipline: discName });
        window.location.reload();
      }
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    await logSystemAction('Úprava poznámky k platbě', { rider: riderName, note });
    alert('Poznámka k platbě uložena!');
  };

  // HRÁČ FUNKCE
  const handleRaceRegistration = async () => {
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0) {
      alert("Vyberte závod, koně a aspoň jednu disciplínu.");
      return;
    }

    let finalHorseName = selectedHorse;

    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napište jméno nového koně!");
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName }])
        .select().single();
      if (horseErr) return alert("Chyba při ukládání koně: " + horseErr.message);
      finalHorseName = newHorse.name;
    }

    const selectedEventObj = events.find(e => e.id === selectedEvent);
    const maxCapacity = selectedEventObj?.max_capacity || 200;

    const { data: takenNumbers } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const taken = takenNumbers?.map(t => t.start_number) || [];
    const available = Array.from({ length: maxCapacity }, (_, i) => i + 1).filter(n => !taken.includes(n));

    if (available.length === 0) {
      alert("Kapacita čísel pro tento závod je vyčerpána!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    const registrationData = await Promise.all(selectedDisciplines.map(async (d) => {
      const { data: takenDraws } = await supabase.from('race_participants')
        .select('draw_order')
        .eq('event_id', selectedEvent)
        .eq('discipline', d.discipline_name);
        
      const takenDrawOrders = takenDraws?.map(t => t.draw_order) || [];
      const availableDraws = Array.from({ length: maxCapacity }, (_, i) => i + 1).filter(n => !takenDrawOrders.includes(n));
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
      await logSystemAction('Odeslána přihláška na závod', { horse: finalHorseName, disciplines: selectedDisciplines.map(d=>d.discipline_name) });
      alert(`Přihláška odeslána! Vaše startovní číslo na záda je: ${assignedNumber}. Pořadí do arény najdete u pořadatele.`);
      window.location.reload();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit tuto přihlášku?")) {
      const { error } = await supabase.from('race_participants').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Hráč zrušil přihlášku', { registration_id: id });
        alert('Přihláška byla zrušena.');
        window.location.reload();
      }
    }
  };

  // ROZHODČÍ FUNKCE
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
      alert('Chyba při ukládání: ' + error.message);
    } else {
      await logSystemAction('Uloženo hodnocení (Scoresheet)', { rider: evaluatingParticipant.rider_name, total });
      alert('Hodnocení bylo úspěšně uloženo!');
      setEvaluatingParticipant(null);
      checkUser();
    }
  };

  if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))] : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  return (
    <div style={styles.container}>
      {/* Vložené CSS pro skrytí prvků při tisku a správné roztáhnutí tabulky */}
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

      {/* PŘEPÍNACÍ LIŠTA PRO ADMINA A SUPERADMINA */}
      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="no-print" style={styles.superAdminBar}>
          <strong>{profile?.role === 'superadmin' ? 'SUPERADMIN:' : 'ADMIN:'}</strong> 
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('superadmin')} style={effectiveRole === 'superadmin' ? styles.activeTab : styles.tab}>Superadmin</button>
          )}
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin Pohled</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Rozhodčí Pohled</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hráč Pohled</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>{isSignUp ? 'Nová registrace' : 'Přihlášení'}</h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo (min. 6 znaků)" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
          </button>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* LEVÝ PANEL - PROFIL (Při tisku se schová) */}
          <div className="no-print" style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} type="email" placeholder="Kontaktní e-mail" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Číslo hospodářství" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                <button type="submit" style={styles.btnSave}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>E-mail: {profile?.email || user?.email}</p>
                <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          {/* HLAVNÍ PANEL PODLE ROLE (Toto se bude tisknout) */}
          <div className="print-area" style={styles.card}>
            
            {/* POHLED: ADMIN / SUPERADMIN */}
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <h3 className="no-print" style={{marginTop: 0, borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>Hlavní nastavení</h3>
                
                {/* GLOBÁLNÍ NASTAVENÍ (Schová se při tisku čehokoliv ze záložek) */}
                <div className="no-print">
                  <div style={styles.adminSection}>
                    <h4 style={{margin: '0 0 10px 0'}}>1. Termíny závodů</h4>
                    <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                      <input type="text" placeholder="Název (např. Jarní závody)" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '200px'}} required/>
                      <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                      <input type="number" placeholder="Kapacita" value={newEventCapacity} onChange={e => setNewEventCapacity(e.target.value)} style={{...styles.inputSmall, width: '100px'}} title="Max. startovních čísel" required/>
                      <button type="submit" style={styles.btnSave}>Vypsat závod</button>
                    </form>
                    <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr style={{background: '#eee', textAlign: 'left'}}>
                          <th style={{padding: '8px'}}>Název</th>
                          <th style={{padding: '8px'}}>Datum</th>
                          <th style={{padding: '8px'}}>Kapacita</th>
                          <th style={{padding: '8px'}}>Stav</th>
                          <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(ev => (
                          <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                            <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                            <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString()}</td>
                            <td style={{padding: '8px'}}>{ev.max_capacity || 200} čísel</td>
                            <td style={{padding: '8px', color: ev.is_locked ? '#e65100' : '#2e7d32', fontWeight: 'bold'}}>
                              {ev.is_locked ? 'Uzamčeno pro rozhodčího' : 'Otevřeno'}
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
                    <h4 style={{margin: '0 0 10px 0'}}>2. Ceník disciplín ({pricing.length})</h4>
                    <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                      <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                      <input type="number" placeholder="Cena Kč" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                      <button type="submit" style={styles.btnSave}>Přidat</button>
                    </form>

                    <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                      <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                        <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                          <tr style={{textAlign: 'left'}}>
                            <th style={{padding: '10px'}}>Disciplína</th>
                            <th style={{padding: '10px', width: '80px'}}>Cena</th>
                            <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricing.map(p => (
                            <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                              <td style={{padding: '10px'}}>{p.discipline_name}</td>
                              <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                              <td style={{padding: '10px', textAlign: 'center'}}>
                                <button onClick={() => handleEditPrice(p.id, p.price, p.discipline_name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>✎ Edit</button>
                                <button onClick={() => handleDeletePricing(p.id, p.discipline_name)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>✖ Smazat</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ZÁLOŽKY ZÁVODŮ PRO DETAILNÍ SPRÁVU */}
                <div className="no-print" style={{marginTop: '30px', marginBottom: '15px'}}>
                  <h3 style={{color: '#5d4037', borderBottom: '2px solid #5d4037', paddingBottom: '10px', margin: '0 0 15px 0'}}>Záložky závodů (Detail a tisk)</h3>
                  <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px'}}>
                    <button onClick={() => setAdminSelectedEvent('')} style={!adminSelectedEvent ? styles.activeTab : styles.tab}>Skrýt detaily</button>
                    {events.map(ev => (
                      <button key={ev.id} onClick={() => setAdminSelectedEvent(ev.id)} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                        {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OBSAH VYBRANÉ ZÁLOŽKY ZÁVODU */}
                {adminSelectedEvent && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    {/* STARTKA PRO TENTO ZÁVOD */}
                    <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 className="no-print" style={{margin: 0}}>Kompletní startovní listina</h4>
                        {/* Hlavička speciálně pro tisk */}
                        <h2 style={{display: 'none', margin: '0 0 20px 0', textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px'}} className="print-only">Startovní listina: {events.find(e => e.id === adminSelectedEvent)?.name}</h2>
                        <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                      </div>
                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#eee', textAlign: 'left'}}>
                              <th style={{padding: '8px', width: '60px'}}>Záda</th>
                              <th style={{padding: '8px', width: '60px'}}>Draw</th>
                              <th style={{padding: '8px'}}>Jezdec</th>
                              <th style={{padding: '8px'}}>Kůň</th>
                              <th style={{padding: '8px'}}>Disciplína</th>
                              <th className="no-print" style={{padding: '8px'}}>Poznámka k platbě</th>
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
                                    placeholder="např. Hotově"
                                    style={{padding: '5px', width: '100px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SCORESHEETY K TISKU PRO TENTO ZÁVOD */}
                    <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Hotové Scoresheety k tisku</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout všechny Scoresheety</button>
                      </div>
                      
                      <div className="print-area">
                        {allRegistrations.filter(r => r.event_id === adminSelectedEvent && scoresheets.some(s => s.participant_id === r.id)).length === 0 ? (
                          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádné ohodnocené výsledky pro tento závod.</p>
                        ) : (
                          allRegistrations.filter(r => r.event_id === adminSelectedEvent && scoresheets.some(s => s.participant_id === r.id)).map(r => {
                            const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                            return (
                              <div key={r.id} className="print-border page-break" style={{background: '#fff', padding: '20px', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                  <h2 style={{marginTop: 0, fontSize: '1.4rem'}}>{r.discipline}</h2>
                                  <h2 style={{marginTop: 0, fontSize: '1.4rem'}}>Startovní číslo: {r.start_number}</h2>
                                </div>
                                <p style={{fontSize: '1.1rem', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                                  Jezdec: <strong>{r.rider_name}</strong> | Kůň: <strong>{r.horse_name}</strong>
                                </p>
                                
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                                  <div>
                                    <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry (Skóre)</h4>
                                    {scoreObj.score_data.maneuvers.map((score, index) => (
                                      <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center', borderBottom: '1px dashed #eee', paddingBottom: '4px'}}>
                                        <span>Manévr {index + 1}</span>
                                        <strong>{score > 0 ? `+${score}` : score}</strong>
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestné body)</h4>
                                    {scoreObj.score_data.penalties.map((penalty, index) => (
                                      <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center', borderBottom: '1px dashed #eee', paddingBottom: '4px'}}>
                                        <span>U manévru {index + 1}</span>
                                        <strong>{penalty > 0 ? `-${penalty}` : '0'}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div style={{marginTop: '20px', padding: '10px', background: '#e1f5fe', textAlign: 'right', border: '2px solid black'}}>
                                  <span style={{fontSize: '1.1rem', color: '#000'}}>Základ: 70 | </span>
                                  <strong style={{fontSize: '1.3rem', color: '#000'}}>CELKOVÉ SKÓRE: {scoreObj.total_score}</strong>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUPERADMIN ŠPIONÁŽ (Skryto při tisku) */}
                {effectiveRole === 'superadmin' && (
                  <div className="no-print" style={{...styles.adminSection, border: '2px solid #000', background: '#e0e0e0', marginTop: '20px'}}>
                    <h4 style={{margin: '0 0 10px 0'}}>Logy systému (Špionáž)</h4>
                    <div style={{maxHeight: '300px', overflowY: 'auto', background: '#fff', padding: '10px'}}>
                      {systemLogs.length === 0 ? <p>Žádné záznamy.</p> : (
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

            {/* POHLED: ROZHODČÍ */}
            {effectiveRole === 'judge' && (
              <div className="print-area">
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd'}}>Rozhodčí panel - Scoresheet</h3>
                </div>
                
                {evaluatingParticipant ? (
                  <div className="print-border print-area" style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <h2 style={{marginTop: 0}}>{evaluatingParticipant.discipline}</h2>
                      <h2 style={{marginTop: 0}}>Startovní číslo: {evaluatingParticipant.start_number}</h2>
                    </div>
                    <p style={{fontSize: '1.2rem', marginBottom: '30px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                      <div>
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry (Skóre)</h4>
                        {maneuverScores.map((score, index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                            <strong>Manévr {index + 1}</strong>
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
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestné body)</h4>
                        {penaltyScores.map((penalty, index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                            <strong>U manévru {index + 1}</strong>
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
                      <span style={{fontSize: '1.2rem', color: '#000'}}>Základ: 70 | </span>
                      <strong style={{fontSize: '1.5rem', color: '#000'}}>CELKOVÉ SKÓRE: {calculateTotalScore()}</strong>
                    </div>

                    <div className="no-print" style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                      <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Uložit hodnocení</button>
                      <button onClick={() => handlePrint('single_score')} style={{...styles.btnOutline, flex: 1, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout hotový scoresheet</button>
                      <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 1, marginTop: 0}}>Zpět na listinu</button>
                    </div>
                  </div>
                ) : (
                  <div className="no-print">
                    <label style={styles.label}>Vyberte uzamčený závod k hodnocení:</label>
                    <select style={styles.input} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); setJudgeDiscipline(''); }}>
                      <option value="">-- Zvolte závod --</option>
                      {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>

                    {judgeEvent && (
                      <div>
                        <label style={styles.label}>Vyberte disciplínu:</label>
                        <select style={styles.input} value={judgeDiscipline} onChange={e => setJudgeDiscipline(e.target.value)}>
                          <option value="">-- Zvolte disciplínu --</option>
                          {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    )}

                    {judgeEvent && judgeDiscipline && (
                      <div style={{marginTop: '20px'}}>
                        <h4>Startovní pořadí: {judgeDiscipline}</h4>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                              <th style={{padding: '10px'}}>Draw</th>
                              <th style={{padding: '10px'}}>Záda</th>
                              <th style={{padding: '10px'}}>Jezdec</th>
                              <th style={{padding: '10px'}}>Kůň</th>
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
                              <tr><td colSpan="5" style={{padding: '15px', textAlign: 'center'}}>Žádní přihlášení jezdci v této disciplíně.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* POHLED: HRÁČ */}
            {effectiveRole === 'player' && (
              <div className="no-print">
                <h3 style={{marginTop: 0}}>Nová přihláška k závodu</h3>
                
                <label style={styles.label}>1. Vyberte závod (Otevřené přihlášky):</label>
                <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">-- Který závod pojedete? --</option>
                  {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString()})</option>)}
                </select>

                <label style={styles.label}>2. Vyberte koně:</label>
                <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně z historie --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Přidat nového koně</option>
                </select>
                {selectedHorse === 'new' && (
                  <input type="text" placeholder="Napište jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, border: '2px solid #8d6e63'}} />
                )}

                <label style={styles.label}>3. Disciplíny (Možno vybrat více):</label>
                {pricing.length === 0 ? <p style={{color: 'red'}}>Admin ještě nevypsal ceník disciplín.</p> : (
                  <div style={styles.disciplineList}>
                    {pricing.map(d => (
                      <div key={d.id} onClick={() => {
                        const exists = selectedDisciplines.find(x => x.id === d.id);
                        setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                      }} style={{...styles.disciplineItem, background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                        {d.discipline_name} <strong>{d.price} Kč</strong>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={styles.priceTag}>
                  Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč
                </div>

                <button onClick={handleRaceRegistration} style={styles.btnSecondary}>ODESLAT PŘIHLÁŠKU</button>

                {/* TABULKA PŘIHLÁŠEK HRÁČE */}
                {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                  <div style={{marginTop: '40px'}}>
                    <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Moje přihlášky a výsledky</h3>
                    <div style={{overflowX: 'auto'}}>
                      <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                        <thead>
                          <tr style={{background: '#eee', textAlign: 'left'}}>
                            <th style={{padding: '8px'}}>Závod</th>
                            <th style={{padding: '8px'}}>Kůň</th>
                            <th style={{padding: '8px'}}>Disciplína</th>
                            <th style={{padding: '8px'}}>Záda</th>
                            <th style={{padding: '8px'}}>Skóre</th>
                            <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                            const eventObj = events.find(e => e.id === r.event_id);
                            const eventName = eventObj?.name || 'Neznámý závod';
                            const isEventLocked = eventObj?.is_locked || false;
                            const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                            
                            return (
                              <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px'}}>{eventName}</td>
                                <td style={{padding: '8px'}}>{r.horse_name}</td>
                                <td style={{padding: '8px'}}>{r.discipline}</td>
                                <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? '#2e7d32' : '#888'}}>
                                  {scoreObj ? scoreObj.total_score : 'Čeká se na hodnocení'}
                                </td>
                                <td style={{padding: '8px', textAlign: 'center'}}>
                                  {!isEventLocked ? (
                                    <button onClick={() => handleCancelRegistration(r.id)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>✖ Zrušit</button>
                                  ) : (
                                    <span style={{color: '#888', fontSize: '0.8rem'}}>Uzamčeno</span>
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
