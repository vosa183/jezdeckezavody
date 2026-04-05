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
  const [allProfiles, setAllProfiles] = useState([]);
  
  // Stavy pro hráče
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [editMode, setEditMode] = useState(false);

  // Stavy pro Admina
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');

  // Stavy pro Rozhodčího
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);
  
  // Stavy pro samotný Scoresheet
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));

  // Přepínač rolí
  const [simulatedRole, setSimulatedRole] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

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
          
          const { data: profs } = await supabase.from('profiles').select('*');
          setAllProfiles(profs || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.reload();
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
    else { alert('Profil uložen!'); setEditMode(false); }
  };

  // ADMIN FUNKCE
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ name: newEventName, event_date: newEventDate }]);
    if (error) alert(error.message);
    else { alert('Závod vytvořen!'); window.location.reload(); }
  };

  const toggleEventLock = async (id, currentLocked) => {
    if (confirm(currentLocked ? 'Opravdu chcete závod znovu otevřít pro přihlášky?' : 'Opravdu chcete uzamknout přihlášky a odeslat startku rozhodčímu?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice) }]);
    if (error) alert(error.message);
    else { alert('Disciplína přidána do ceníku!'); window.location.reload(); }
  };

  const handleEditPrice = async (id, oldPrice) => {
    const newPrice = prompt("Zadejte novou cenu v Kč:", oldPrice);
    if (newPrice !== null && newPrice !== "") {
      const { error } = await supabase.from('pricing').update({ price: parseInt(newPrice) }).eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const handleDeletePricing = async (id) => {
    if (confirm("Opravdu chcete tuto disciplínu smazat z ceníku?")) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    alert('Poznámka k platbě uložena!');
  };

  const handleCopyEmails = () => {
    const emails = allProfiles.filter(p => p.email).map(p => p.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      alert('E-maily všech jezdců byly zkopírovány! Nyní je můžete vložit do Skryté kopie (Bcc) ve svém e-mailu.');
    }).catch(err => {
      alert('Chyba při kopírování. Zkopírujte je ručně: ' + emails);
    });
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

    const { data: takenNumbers } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const taken = takenNumbers?.map(t => t.start_number) || [];
    const available = Array.from({ length: 100 }, (_, i) => i + 1).filter(n => !taken.includes(n));

    if (available.length === 0) {
      alert("Kapacita čísel je vyčerpána!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    const registrationData = await Promise.all(selectedDisciplines.map(async (d) => {
      const { data: takenDraws } = await supabase.from('race_participants')
        .select('draw_order')
        .eq('event_id', selectedEvent)
        .eq('discipline', d.discipline_name);
        
      const takenDrawOrders = takenDraws?.map(t => t.draw_order) || [];
      const availableDraws = Array.from({ length: 100 }, (_, i) => i + 1).filter(n => !takenDrawOrders.includes(n));
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
      alert(`Přihláška odeslána! Vaše startovní číslo na záda je: ${assignedNumber}. Pořadí do arény najdete u pořadatele.`);
      window.location.reload();
    }
  };

  // ROZHODČÍ FUNKCE
  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    setManeuverScores(Array(10).fill(0));
    setPenaltyScores(Array(10).fill(0));
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
    const baseScore = 70; // <-- TADY SE MĚNÍ ZÁKLAD. Pokud chceš začínat od nuly, přepíšu ti to na 0.
    const maneuversTotal = maneuverScores.reduce((acc, val) => acc + val, 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => acc + val, 0);
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    
    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      score_data: scoreData,
      total_score: total
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      alert('Hodnocení bylo úspěšně uloženo!');
      setEvaluatingParticipant(null);
      checkUser();
    }
  };

  if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';

  // Filtrování pro Rozhodčího a Tisk
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))] : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  // Pokud jsme v režimu tisku, chceme jen čistou mřížku
  if (showPrintView) {
    return (
      <div style={{padding: '20px', fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: '100vh'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}} className="no-print">
          <button onClick={() => setShowPrintView(false)} style={styles.btnSecondary}>← Zpět do systému</button>
          <button onClick={() => window.print()} style={{...styles.btnSave, background: '#0277bd', padding: '15px', fontSize: '1.2rem'}}>🖨️ Vytisknout tuto stránku</button>
        </div>
        
        <h2 style={{textAlign: 'center', margin: '0 0 5px 0'}}>Závody: {events.find(e => e.id === judgeEvent)?.name || 'Neznámý závod'}</h2>
        <h3 style={{textAlign: 'center', margin: '0 0 20px 0'}}>Disciplína: {judgeDiscipline}</h3>
        
        <table style={{width: '100%', borderCollapse: 'collapse', border: '2px solid #000'}}>
          <thead>
            <tr style={{background: '#f0f0f0'}}>
              <th style={{...styles.printCell, width: '40px'}}>Draw</th>
              <th style={{...styles.printCell, width: '40px'}}>Záda</th>
              <th style={{...styles.printCell, width: '150px'}}>Jezdec</th>
              <th style={{...styles.printCell, width: '150px'}}>Kůň</th>
              {[...Array(10)].map((_, i) => <th key={i} style={styles.printCell}>M{i+1}</th>)}
              <th style={styles.printCell}>Penalty</th>
              <th style={styles.printCell}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {judgeStartList.map(r => {
              const scoreObj = scoresheets.find(s => s.participant_id === r.id);
              return (
                <tr key={r.id}>
                  <td style={{...styles.printCell, fontWeight: 'bold', textAlign: 'center'}}>{r.draw_order}</td>
                  <td style={{...styles.printCell, fontWeight: 'bold', textAlign: 'center'}}>{r.start_number}</td>
                  <td style={styles.printCell}>{r.rider_name}</td>
                  <td style={styles.printCell}>{r.horse_name}</td>
                  {[...Array(10)].map((_, i) => (
                    <td key={i} style={{...styles.printCell, textAlign: 'center', height: '35px'}}>
                      {scoreObj?.score_data?.maneuvers?.[i] !== undefined && scoreObj.score_data.maneuvers[i] !== 0 ? scoreObj.score_data.maneuvers[i] : ''}
                    </td>
                  ))}
                  <td style={{...styles.printCell, textAlign: 'center'}}>
                     {scoreObj?.score_data?.penalties?.reduce((a,b) => a+b, 0) || ''}
                  </td>
                  <td style={{...styles.printCell, textAlign: 'center', fontWeight: 'bold'}}>
                     {scoreObj ? scoreObj.total_score : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white; margin: 0; padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* PŘEPÍNACÍ LIŠTA PRO ADMINA A SUPERADMINA */}
      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div style={styles.superAdminBar}>
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

      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div style={styles.card}>
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
          {/* LEVÝ PANEL - PROFIL */}
          <div style={styles.sideCard}>
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

          {/* HLAVNÍ PANEL PODLE ROLE */}
          <div style={styles.card}>
            
            {/* POHLED: ADMIN / SUPERADMIN */}
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #5d4037', paddingBottom: '10px', alignItems: 'center'}}>
                  <h3 style={{marginTop: 0, marginBottom: 0}}>Správa Závodů (Admin)</h3>
                  <button onClick={handleCopyEmails} style={{...styles.btnSave, background: '#0277bd', padding: '8px 12px', fontSize: '0.85rem'}}>📧 Zkopírovat E-maily jezdců</button>
                </div>
                
                <div style={styles.adminSection}>
                  <h4 style={{margin: '0 0 10px 0'}}>1. Termíny závodů</h4>
                  <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                    <input type="text" placeholder="Název (např. Jarní závody)" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '200px'}} required/>
                    <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                    <button type="submit" style={styles.btnSave}>Vypsat závod</button>
                  </form>
                  <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#eee', textAlign: 'left'}}>
                        <th style={{padding: '8px'}}>Název</th>
                        <th style={{padding: '8px'}}>Datum</th>
                        <th style={{padding: '8px'}}>Stav</th>
                        <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(ev => (
                        <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                          <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                          <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString()}</td>
                          <td style={{
