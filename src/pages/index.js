/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

// BEZPEČNÉ ODESÍLÁNÍ (TOKENY JSOU SCHOVANÉ NA SERVERU)
const sendTelegramMessage = async (text) => {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
  } catch (err) {
    console.error('Chyba při odesílání na náš server:', err);
  }
};

async function generateHash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const disciplineRuleHints = {
  default: [
    "Skóre se hodnotí od -1.5 do +1.5. Základní skóre je 70."
  ],
  ranch: [
    "Penalta 1: Za otěží, rozpadlý rámec, přílišná pomalost, přerušení chodu do 2 kroků.",
    "Penalta 3: Cval na špatnou nohu, tah za otěže, krok/klus > 2 kroky.",
    "Penalta 5: Zjevná neposlušnost.",
    "DQ: Kulhavost, týrání, pád."
  ],
  trail: [
    "Penalta 1/2: Lehký dotek překážky.",
    "Penalta 1: Úder do překážky, krok mimo překážku 1 nohou.",
    "Penalta 3: Pád překážky, krok mimo 2+ nohama.",
    "Penalta 5: Odmítnutí, vyhnutí se, puštění branky.",
    "DQ: Pád, třetí odmítnutí."
  ],
  reining: [
    "Penalta 1/2: Zpožděná změna o 1 skok, nedotočení spinu.",
    "Penalta 1: Změna cvalu zpožděná, přetočení spinu.",
    "Penalta 2: Zmrznutí ve spinu.",
    "Penalta 5: Spur stop, držení sedla."
  ],
  showmanship: [
    "POZOR: Hodnotí se od -3 (Extrémně špatné) do +3 (Excelentní) pouze po celých bodech!",
    "Penalizace: Malá = 3 b., Velká = 5 b., Závažná = 10 b."
  ]
};

const getRulesForDiscipline = (disciplineName) => {
  const nameL = disciplineName.toLowerCase();
  if (nameL.includes('ranch') || nameL.includes('riding')) return disciplineRuleHints.ranch;
  if (nameL.includes('trail')) return disciplineRuleHints.trail;
  if (nameL.includes('reining')) return disciplineRuleHints.reining;
  if (nameL.includes('showmanship') || nameL.includes('horsemanship') || nameL.includes('equitation')) return disciplineRuleHints.showmanship;
  return disciplineRuleHints.default;
};

export default function Home() {
  const [currentTab, setCurrentTab] = useState('app'); 
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  const [globalRules, setGlobalRules] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseYear, setNewHorseYear] = useState(''); 
  const [newHorseLicense, setNewHorseLicense] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');

  // INLINE EDITACE CENÍKU A DISCIPLÍN
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editDiscSort, setEditDiscSort] = useState(0);
  const [editDiscManeuvers, setEditDiscManeuvers] = useState('');
  
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [newDiscSort, setNewDiscSort] = useState(0);
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  // ADMIN HOST REGISTRACE
  const [hostRiderName, setHostRiderName] = useState('');
  const [hostRiderAgeObj, setHostRiderAgeObj] = useState('18+');
  const [hostHorseName, setHostHorseName] = useState('');
  const [hostSelectedDisc, setHostSelectedDisc] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');
  const [editPropositionsText, setEditPropositionsText] = useState('');

  // ZAPISOVATEL (Scribe) TABS
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  
  const [actualJudgeName, setActualJudgeName] = useState('');
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));
  const [isDQ, setIsDQ] = useState(false);

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  // Veřejná data nahrát hned (ceník a pravidla)
  useEffect(() => {
    fetchPublicData();
    checkUser();
  }, []);

  const fetchPublicData = async () => {
    const { data: prices } = await supabase.from('pricing').select('*').order('sort_order', { ascending: true });
    if (prices) setPricing(prices);

    const { data: rules } = await supabase.from('system_settings').select('rules_text').eq('id', 1).single();
    if (rules) {
        setGlobalRules(rules.rules_text);
        setEditPropositionsText(rules.rules_text);
    }
  };

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
    }, 10000); 
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
        alert('Registrace úspěšná! Můžeš vstoupit.');
        window.location.reload();
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        window.location.reload();
      }
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      birth_date: profile.birth_date,
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { 
      alert('Profil uložen!'); 
      setEditMode(false); 
    }
  };

  const calculateAge = (dobString) => {
    if(!dobString) return '?';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms); 
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  const savePropositions = async () => {
    const { error } = await supabase.from('system_settings').upsert({ id: 1, rules_text: editPropositionsText });
    if(error) alert(error.message);
    else alert('Propozice uloženy!');
  };

  const handleHostRegistration = async (e) => {
    e.preventDefault();
    const evObj = events.find(ev => ev.id === adminSelectedEvent);
    const capacity = (evObj?.start_num_to || 200) - (evObj?.start_num_from || 1) + 1;
    const { data: freshRegs } = await supabase.from('race_participants').select('start_number').eq('event_id', adminSelectedEvent);
    
    let assignedNumber = Math.floor(Math.random() * capacity) + (evObj?.start_num_from || 1);
    // V jednoduchosti to necháme takhle u hosta
    
    const { error } = await supabase.from('race_participants').insert([{
        user_id: user.id, // Admin id
        event_id: adminSelectedEvent,
        rider_name: hostRiderName,
        age_category: hostRiderAgeObj,
        horse_name: hostHorseName,
        discipline: hostSelectedDisc,
        start_number: assignedNumber,
        draw_order: Math.floor(Math.random() * 50) + 1,
        price: pricing.find(p => p.discipline_name === hostSelectedDisc)?.price || 0,
        is_paid: false
    }]);

    if(error) alert(error.message);
    else {
        alert('Hostovský jezdec přidán na startku!');
        setHostRiderName(''); setHostHorseName('');
        checkUser();
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode('');
    }, 500); 
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('pricing').insert([{ 
        discipline_name: newDiscName, 
        price: parseInt(newDiscPrice),
        sort_order: parseInt(newDiscSort) 
    }]);
    if (error) alert(error.message);
    else window.location.reload(); 
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditDiscSort(p.sort_order || 0);
    setEditDiscManeuvers(p.maneuver_names || '');
  };

  const handleSaveEditPricing = async (id) => {
    const { error } = await supabase.from('pricing').update({ 
        price: parseInt(editDiscPrice),
        sort_order: parseInt(editDiscSort),
        maneuver_names: editDiscManeuvers
    }).eq('id', id);
    if (error) alert(error.message);
    else {
      setEditingPricingId(null);
      fetchPublicData();
    }
  };

  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.birth_date) {
      alert("Než se přihlásíte, musíte mít vyplněné jméno a datum narození v profilu!");
      return;
    }
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) {
      alert("Vyplňte jméno jezdce, závod, koně a aspoň jednu disciplínu.");
      return;
    }

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) return alert("Napište jméno koně!");
      const { data: newH } = await supabase.from('horses').insert([{ 
          owner_id: user.id, name: newHorseName.trim(), birth_year: parseInt(newHorseYear), license_number: newHorseLicense 
      }]).select().single();
      finalHorseName = newH.name;
    }

    const { data: freshRegs } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const assignedNumber = Math.floor(Math.random() * 100) + 1; // Zjednodušeně
    
    const registrationData = selectedDisciplines.map(d => ({
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: customRiderName.trim(),
        age_category: riderAgeCategory,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: Math.floor(Math.random() * 50) + 1,
        price: d.price
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      alert(`Přihláška odeslána!`);
      window.location.reload();
    }
  };

  // --- HODNOCENÍ JÍZDY ---
  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(0));
      setIsDQ(existingScore.is_dq || false);
      setActualJudgeName(existingScore.actual_judge_name || '');
    } else {
      setManeuverScores(Array(10).fill(0));
      setPenaltyScores(Array(10).fill(0));
      setIsDQ(false);
    }
  };

  const calculateTotalScore = () => {
    if(isDQ) return -9999;
    const baseScore = 70;
    const isShowmanship = evaluatingParticipant?.discipline.toLowerCase().includes('showmanship') || evaluatingParticipant?.discipline.toLowerCase().includes('horsemanship');
    const startBase = isShowmanship ? 0 : baseScore;
    
    let mTotal = 0;
    maneuverScores.forEach(s => mTotal += (parseFloat(s) || 0));
    let pTotal = 0;
    penaltyScores.forEach(s => pTotal += (parseFloat(s) || 0));
    
    return startBase + mTotal - pTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    
    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      judge_name: profile.full_name, // Zapisovatel
      actual_judge_name: actualJudgeName, // Skutečný rozhodčí
      scored_at: new Date().toISOString(),
      signature_hash: 'signed',
      score_data: scoreData,
      total_score: total,
      is_dq: isDQ
    });

    if (error) alert('Chyba při ukládání: ' + error.message);
    else {
      alert('Hodnocení bylo uloženo!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;
    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];

    return (
      <div className="print-area">
        {disciplines.length === 0 ? null : (
          disciplines.map(discipline => {
            const discData = pricing.find(p => p.discipline_name === discipline);
            const rawManeuvers = discData?.maneuver_names ? discData.maneuver_names.split(',') : [];
            const maneuversList = Array.from({length: 10}, (_, i) => rawManeuvers[i] ? rawManeuvers[i].trim() : `${i+1}`);

            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => a.draw_order - b.draw_order);
            if(ridersInDiscipline.length === 0) return null;
            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            
            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '50px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.5rem' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: '#444' }}>SCORESHEET: {discipline}</h3>
                </div>
                
                <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.90rem' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '40px' }}>DRAW</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '40px' }}>EXH#</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', textAlign: 'left' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '2px', width: '30px' }}></th>
                      <th colSpan="10" style={{ border: '2px solid black', padding: '6px', textAlign: 'center', background: '#f5f5f5' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '50px' }}>PEN<br/>TOT</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '60px' }}>FINAL</th>
                    </tr>
                    <tr>
                      {maneuversList.map((m, i) => (
                        <th key={i} style={{ border: '2px solid black', padding: '4px', width: '40px', fontSize: '0.75rem', wordWrap: 'break-word', maxWidth: '50px' }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const pTotal = scoreObj ? scoreObj.score_data.penalties.reduce((a,b)=>a+(parseFloat(b)||0),0) : '';
                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{r.draw_order}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', borderRight: '1px solid black' }}>
                              <div style={{ fontWeight: 'bold' }}>{r.rider_name}</div>
                              <div style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', padding: '2px', fontSize: '0.65rem', background: '#f9f9f9', textAlign: 'center' }}>PEN</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => (
                              <td key={`p-${i}`} style={{ border: '1px solid black', textAlign: 'center', color: 'red', fontWeight: 'bold', height: '25px' }}>
                                {scoreObj && scoreObj.score_data.penalties[i] > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                              </td>
                            ))}
                            <td rowSpan="2" style={{ border: '2px solid black', textAlign: 'center', color: 'red', fontWeight: 'bold' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {scoreObj ? (scoreObj.is_dq ? 'DQ' : scoreObj.total_score) : ''}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', padding: '2px', fontSize: '0.65rem', background: '#f9f9f9', textAlign: 'center' }}>SCORE</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => (
                              <td key={`s-${i}`} style={{ border: '1px solid black', textAlign: 'center' }}>
                                {scoreObj && parseFloat(scoreObj.score_data.maneuvers[i]) !== 0 ? (parseFloat(scoreObj.score_data.maneuvers[i]) > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i]) : (scoreObj ? '' : '')}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: '30px', borderTop: '2px solid black', paddingTop: '10px' }}>
                  <p style={{ margin: '0', fontSize: '0.9rem' }}>Rozhodčí: <strong>{signatureObj ? signatureObj.actual_judge_name : '__________________'}</strong> (Zapsal: {signatureObj?.judge_name})</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    );
  };

  const effectiveRole = simulatedRole || profile?.role || 'player';

  if (currentTab === 'rules') {
    return (
      <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={styles.tab}>🐎 Zpět do Aplikace</button>
        </div>
        <div className="no-print" style={{...styles.card, whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>
          <h2 style={{color: '#5d4037'}}>PROPOZICE ZÁVODŮ</h2>
          {globalRules ? globalRules : 'Propozice zatím nebyly administrátorem vyplněny.'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; margin: 0; padding: 0; font-size: 11pt; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; max-width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .page-break { page-break-after: always; position: relative; }
          .wrc-scoresheet th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input, select { border: none !important; appearance: none !important; background: transparent !important; }
        }
      `}</style>

      {user && (
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={styles.activeTab}>🐎 Závodní Portál</button>
          <button onClick={() => setCurrentTab('rules')} style={styles.tab}>📜 Propozice a Pravidla</button>
        </div>
      )}

      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="no-print" style={{...styles.superAdminBar}}>
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin</button>
          <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Zapisovatel</button>
          <button onClick={() => setSimulatedRole('speaker')} style={effectiveRole === 'speaker' ? styles.activeTab : styles.tab}>Spíkr</button>
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Jezdec</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
          <div style={{...styles.card, flex: 1, minWidth: '300px'}}>
            <h2 style={{textAlign: 'center', color: '#5d4037'}}>Přihlášení</h2>
            <form onSubmit={handleAuth} style={styles.form}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
              <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}</button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>Přepnout registraci/přihlášení</button>
          </div>
          <div style={{...styles.card, flex: 1, minWidth: '300px'}}>
            <h3 style={{color: '#5d4037'}}>Vypsané Disciplíny</h3>
            <ul style={{listStyleType: 'square', paddingLeft: '20px',
