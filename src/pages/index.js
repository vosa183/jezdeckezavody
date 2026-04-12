/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

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
  if(!disciplineName) return disciplineRuleHints.default;
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

  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editDiscSort, setEditDiscSort] = useState(0);
  const [editDiscManeuvers, setEditDiscManeuvers] = useState('');
  const [editPatternFile, setEditPatternFile] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [newDiscSort, setNewDiscSort] = useState(0);
  const [patternFile, setPatternFile] = useState(null);

  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  const [hostRiderName, setHostRiderName] = useState('');
  const [hostRiderAgeObj, setHostRiderAgeObj] = useState('18+');
  const [hostHorseName, setHostHorseName] = useState('');
  const [hostSelectedDisc, setHostSelectedDisc] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');
  const [editPropositionsText, setEditPropositionsText] = useState('');

  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  
  const [actualJudgeName, setActualJudgeName] = useState('');
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));
  const [isDQ, setIsDQ] = useState(false);

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

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

  const logSystemAction = async (actionDesc, detailData = {}) => {
    if (!user) return;
    await supabase.from('system_logs').insert([{ user_id: user.id, action: actionDesc, details: detailData }]);
  };

  const handleSignOut = async () => {
    await logSystemAction('Odhlášení');
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data?.user) {
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        alert('Registrace úspěšná!');
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
      birth_date: profile.birth_date,
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { alert('Profil uložen!'); setEditMode(false); }
  };

  const savePropositions = async () => {
    const { error } = await supabase.from('system_settings').upsert({ id: 1, rules_text: editPropositionsText });
    if(error) alert(error.message);
    else alert('Propozice uloženy!');
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    let patternUrl = null;
    if (patternFile) {
      const fileExt = patternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      if (uploadError) return alert('Chyba nahrávání: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('pricing').insert([{ 
        discipline_name: newDiscName, 
        price: parseInt(newDiscPrice),
        sort_order: parseInt(newDiscSort),
        pattern_url: patternUrl
    }]);
    if (error) alert(error.message);
    else window.location.reload(); 
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditDiscSort(p.sort_order || 0);
    setEditDiscManeuvers(p.maneuver_names || '');
    setEditPatternFile(null);
  };

  const handleSaveEditPricing = async (id) => {
    let patternUrl = undefined;
    if (editPatternFile) {
      const fileExt = editPatternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('patterns').upload(fileName, editPatternFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
        patternUrl = urlData.publicUrl;
      }
    }

    const updateData = { 
      price: parseInt(editDiscPrice),
      sort_order: parseInt(editDiscSort),
      maneuver_names: editDiscManeuvers
    };
    if (patternUrl !== undefined) updateData.pattern_url = patternUrl;

    const { error } = await supabase.from('pricing').update(updateData).eq('id', id);
    if (error) alert(error.message);
    else { setEditingPricingId(null); fetchPublicData(); }
  };

  const handleDeletePricing = async (id) => {
    if (confirm("Opravdu smazat?")) {
      await supabase.from('pricing').delete().eq('id', id);
      window.location.reload();
    }
  };

  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.birth_date) return alert("Musíte mít vyplněné jméno a datum narození v profilu!");
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) return alert("Vyplňte všechna pole.");

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) return alert("Jméno koně chybí!");
      const { data: newH } = await supabase.from('horses').insert([{ 
          owner_id: user.id, name: newHorseName.trim(), birth_year: parseInt(newHorseYear), license_number: newHorseLicense 
      }]).select().single();
      finalHorseName = newH.name;
    }

    const assignedNumber = Math.floor(Math.random() * 100) + 1;
    const registrationData = selectedDisciplines.map(d => ({
        user_id: user.id, event_id: selectedEvent, rider_name: customRiderName.trim(), age_category: riderAgeCategory,
        horse_name: finalHorseName, discipline: d.discipline_name, start_number: assignedNumber,
        draw_order: Math.floor(Math.random() * 50) + 1, price: d.price
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message); else window.location.reload();
  };

  const handleHostRegistration = async (e) => {
    e.preventDefault();
    const assignedNumber = Math.floor(Math.random() * 100) + 1;
    const { error } = await supabase.from('race_participants').insert([{
        user_id: user.id, event_id: adminSelectedEvent, rider_name: hostRiderName, age_category: hostRiderAgeObj,
        horse_name: hostHorseName, discipline: hostSelectedDisc, start_number: assignedNumber,
        draw_order: Math.floor(Math.random() * 50) + 1, price: pricing.find(p => p.discipline_name === hostSelectedDisc)?.price || 0
    }]);
    if(error) alert(error.message); else { alert('Host přidán!'); setHostRiderName(''); setHostHorseName(''); checkUser(); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ name: newEventName, event_date: newEventDate, start_num_from: parseInt(newStartNumFrom), start_num_to: parseInt(newStartNumTo) }]);
    if (error) alert(error.message); else window.location.reload();
  };

  const toggleEventLock = async (id, currentLocked) => {
    await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
    window.location.reload();
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    alert('Zde napojíš Vercel API pro creati účtu (stejně jako v původní verzi).');
  };

  const sendManualTgMessage = async () => {
    if(!manualTgMessage) return;
    await sendTelegramMessage(`📢 <b>INFO:</b>\n\n${manualTgMessage}`);
    setManualTgMessage('');
  };

  const calculateTotalScore = () => {
    if(isDQ) return -9999;
    const isShowmanship = evaluatingParticipant?.discipline.toLowerCase().includes('show') || evaluatingParticipant?.discipline.toLowerCase().includes('horse');
    const startBase = isShowmanship ? 0 : 70;
    let mTotal = 0; maneuverScores.forEach(s => mTotal += (parseFloat(s) || 0));
    let pTotal = 0; penaltyScores.forEach(s => pTotal += (parseFloat(s) || 0));
    return startBase + mTotal - pTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);
    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id, judge_id: user.id, judge_name: profile.full_name, actual_judge_name: actualJudgeName,
      scored_at: new Date().toISOString(), signature_hash: 'signed', score_data: scoreData, total_score: total, is_dq: isDQ
    });
    if (error) alert(error.message); else { setEvaluatingParticipant(null); checkUser(); }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    const score = scoresheets.find(s => s.participant_id === participant.id);
    setManeuverScores(score?.score_data.maneuvers || Array(10).fill(0));
    setPenaltyScores(score?.score_data.penalties || Array(10).fill(0));
    setIsDQ(score?.is_dq || false);
    setActualJudgeName(score?.actual_judge_name || '');
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

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => { window.print(); setPrintMode(''); }, 500); 
  };

  const effectiveRole = simulatedRole || profile?.role || 'player';

  if (loading) return <div style={styles.loader}>Načítám...</div>;

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
            <ul style={{listStyleType: 'square', paddingLeft: '20px'}}>
              {pricing.map(p => (
                <li key={p.id} style={{marginBottom: '5px'}}>{p.discipline_name} {p.pattern_url && <a href={p.pattern_url} target="_blank" style={{fontSize: '0.8rem', color: '#0288d1'}}>(Úloha)</a>}</li>
              ))}
            </ul>
            <button onClick={() => setCurrentTab('rules')} style={{...styles.btnOutline, marginTop: '20px'}}>Zobrazit kompletní propozice</button>
          </div>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          
          <div className="no-print" style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} type="date" placeholder="Datum narození" value={profile?.birth_date || ''} onChange={e => setProfile({...profile, birth_date: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})}/>
                <button type="submit" style={styles.btnSave}>Uložit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>Narozen(a): {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString() : 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          <div className="print-area" style={styles.card}>
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div className="no-print" style={{display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '2px solid #5d4037', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setAdminSelectedEvent('')} style={!adminSelectedEvent ? styles.activeTab : styles.tab}>Nastavení</button>
                  <button onClick={() => setAdminSelectedEvent('rules')} style={adminSelectedEvent === 'rules' ? styles.activeTab : styles.tab}>Propozice</button>
                  {events.map(ev => (
                    <button key={ev.id} onClick={() => setAdminSelectedEvent(ev.id)} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                      Detail: {ev.name}
                    </button>
                  ))}
                </div>

                {!adminSelectedEvent && (
                  <div className="no-print">
                    <div style={styles.adminSection}>
                      <h4>Závody</h4>
                      <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px'}}>
                        <input type="text" placeholder="Název" value={newEventName} onChange={e=>setNewEventName(e.target.value)} style={styles.inputSmall} required/>
                        <input type="date" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)} style={styles.inputSmall} required/>
                        <button type="submit" style={styles.btnSave}>Vypsat</button>
                      </form>
                      {events.map(ev => (
                        <div key={ev.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #ccc'}}>
                          <span>{ev.name} ({new Date(ev.event_date).toLocaleDateString()})</span>
                          <button onClick={() => toggleEventLock(ev.id, ev.is_locked)}>{ev.is_locked ? 'Odemknout' : 'Uzamknout'}</button>
                        </div>
                      ))}
                    </div>

                    <div style={styles.adminSection}>
                      <h4>Disciplíny (Ceník a Manévry)</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <input type="text" placeholder="Název" value={newDiscName} onChange={e=>setNewDiscName(e.target.value)} style={{...styles.inputSmall, width: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e=>setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '80px'}} required/>
                        <input type="number" placeholder="Pořadí" value={newDiscSort} onChange={e=>setNewDiscSort(e.target.value)} style={{...styles.inputSmall, width: '80px'}} />
                        <input type="file" onChange={e => setPatternFile(e.target.files[0])} style={{...styles.inputSmall, width: '150px'}}/>
                        <button type="submit" style={styles.btnSave}>Přidat</button>
                      </form>
                      <table style={{width: '100%', marginTop: '15px', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                        <tbody>
                          {pricing.map(p => (
                            <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                              {editingPricingId === p.id ? (
                                <td colSpan="4">
                                  <input type="number" value={editDiscSort} onChange={e=>setEditDiscSort(e.target.value)} style={{width: '50px'}}/>
                                  <input type="number" value={editDiscPrice} onChange={e=>setEditDiscPrice(e.target.value)} style={{width: '60px'}}/>
                                  <input type="text" placeholder="Manévry (Kruh, Spin...)" value={editDiscManeuvers} onChange={e=>setEditDiscManeuvers(e.target.value)} style={{width: '200px'}}/>
                                  <button onClick={() => handleSaveEditPricing(p.id)}>Uložit</button>
                                </td>
                              ) : (
                                <>
                                  <td>{p.sort_order}.</td>
                                  <td><strong>{p.discipline_name}</strong> - {p.price} Kč</td>
                                  <td>{p.maneuver_names?.substring(0, 20)}...</td>
                                  <td>
                                    <button onClick={() => startEditingPricing(p)}>Edit</button>
                                    <button onClick={() => handleDeletePricing(p.id)}>Smazat</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminSelectedEvent === 'rules' && (
                  <div className="no-print">
                    <h3>Úprava Propozic</h3>
                    <textarea value={editPropositionsText} onChange={e => setEditPropositionsText(e.target.value)} rows="20" style={{width: '100%', padding: '10px'}} />
                    <button onClick={savePropositions} style={{...styles.btnSave, marginTop: '10px'}}>Uložit propozice pro všechny</button>
                  </div>
                )}

                {adminSelectedEvent && adminSelectedEvent !== 'rules' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={styles.adminSection}>
                      <h4>Přidat jezdce na místě (Host)</h4>
                      <form onSubmit={handleHostRegistration} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <input placeholder="Jméno jezdce" value={hostRiderName} onChange={e=>setHostRiderName(e.target.value)} required style={styles.inputSmall}/>
                        <input placeholder="Jméno koně" value={hostHorseName} onChange={e=>setHostHorseName(e.target.value)} required style={styles.inputSmall}/>
                        <select value={hostSelectedDisc} onChange={e=>setHostSelectedDisc(e.target.value)} required style={styles.inputSmall}>
                          <option value="">Vyberte disciplínu</option>
                          {pricing.map(p => <option key={p.id} value={p.discipline_name}>{p.discipline_name}</option>)}
                        </select>
                        <button type="submit" style={styles.btnSave}>Zapsat</button>
                      </form>
                    </div>

                    <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                        <h4>Startovní listina</h4>
                        <button onClick={() => handlePrint('startlist')} style={styles.btnOutline}>Vytisknout Startku</button>
                      </div>
                      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                        <thead>
                          <tr style={{background: '#eee', textAlign: 'left'}}>
                            <th>Kategorie</th><th>Záda</th><th>Jezdec</th><th>Kůň</th><th>Disciplína</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRegistrations.filter(r => r.event_id === adminSelectedEvent).map((r, i) => (
                            <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                              <td>{r.age_category}</td><td>{r.start_number}</td><td>{r.rider_name}</td><td>{r.horse_name}</td><td>{r.discipline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={{marginTop: '30px'}}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                         <h4>Scoresheety</h4>
                         <button onClick={() => handlePrint('scoresheets')} style={styles.btnOutline}>Vytisknout Scoresheety</button>
                      </div>
                      {renderPrintableScoresheets(adminSelectedEvent)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {effectiveRole === 'judge' && (
              <div>
                <h3 className="no-print">Panel Zapisovatele</h3>
                {evaluatingParticipant ? (
                  <div className="no-print" style={{background: '#fff', border: '2px solid #0277bd', padding: '20px', borderRadius: '8px'}}>
                    <h2>{evaluatingParticipant.discipline} - Záda: {evaluatingParticipant.start_number}</h2>
                    <p>Jezdec: {evaluatingParticipant.rider_name} | Kůň: {evaluatingParticipant.horse_name}</p>
                    
                    <label>Jméno rozhodčího (Kdo to skutečně pískal):</label>
                    <input type="text" value={actualJudgeName} onChange={e => setActualJudgeName(e.target.value)} style={styles.input} />
                    
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px'}}>
                       <input type="checkbox" checked={isDQ} onChange={e => setIsDQ(e.target.checked)} id="dqCheck" />
                       <label htmlFor="dqCheck" style={{color: 'red', fontWeight: 'bold'}}>DISKVALIFIKACE (DQ)</label>
                    </div>

                    {!isDQ && (
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px'}}>
                        <div>
                          <h4>Manévry (od -1.5 do +1.5, ev. -3 až +3 pro Showmanship)</h4>
                          {maneuverScores.map((score, index) => (
                            <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                              <span>Manévr {index + 1}</span>
                              <input type="number" step="0.5" value={score} onChange={(e) => { const n = [...maneuverScores]; n[index] = e.target.value; setManeuverScores(n); }} style={{width: '60px'}} />
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4>Penalty (trestné body)</h4>
                          {penaltyScores.map((pen, index) => (
                            <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                              <span>U manévru {index + 1}</span>
                              <input type="number" step="0.5" min="0" value={pen} onChange={(e) => { const n = [...penaltyScores]; n[index] = e.target.value; setPenaltyScores(n); }} style={{width: '60px'}} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{marginTop: '20px'}}>
                      <button onClick={saveScore} style={styles.btnSave}>Uložit Hodnocení</button>
                      <button onClick={() => setEvaluatingParticipant(null)} style={styles.btnOutline}>Zpět</button>
                    </div>
                  </div>
                ) : (
                  <div className="no-print">
                    <select value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); setJudgeDiscipline(''); }} style={styles.input}>
                      <option value="">Zvolte závod</option>
                      {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>

                    {judgeEvent && (
                      <select value={judgeDiscipline} onChange={e => setJudgeDiscipline(e.target.value)} style={styles.input}>
                        <option value="">Zvolte disciplínu</option>
                        {[...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}

                    {judgeDiscipline && (
                      <table style={{width: '100%', marginTop: '20px'}}>
                        <tbody>
                          {allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a,b)=>a.draw_order-b.draw_order).map(r => (
                            <tr key={r.id} style={{borderBottom: '1px solid #ccc'}}>
                              <td style={{padding: '10px'}}>{r.draw_order}.</td>
                              <td style={{padding: '10px'}}>{r.start_number}</td>
                              <td style={{padding: '10px'}}>{r.rider_name}</td>
                              <td style={{padding: '10px', textAlign: 'right'}}>
                                <button onClick={() => openScoresheet(r)} style={styles.btnSave}>Zapsat skóre</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {effectiveRole === 'player' && (
              <div className="no-print">
                <h3>Nová přihláška k závodu</h3>
                <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '15px'}}>
                  <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={styles.input} placeholder="Jméno jezdce" />
                  <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={styles.input}>
                    <option value="18+">18 a více let (Open)</option>
                    <option value="Advanced">Mládež - pokročilí (do 18 let)</option>
                    <option value="Rookies">Mládež - začátečníci (do 14 let)</option>
                    <option value="Kids">Děti do 12 let</option>
                    <option value="Foal">Hříbata</option>
                  </select>
                </div>

                <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">-- Zvolte závod --</option>
                  {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>

                <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně z historie --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Nový kůň</option>
                </select>

                {selectedHorse === 'new' && (
                  <div style={{display: 'flex', gap: '10px'}}>
                    <input type="text" placeholder="Jméno koně" value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={styles.input} />
                    <input type="number" placeholder="Rok narození" value={newHorseYear} onChange={e => setNewHorseYear(e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Číslo průkazu" value={newHorseLicense} onChange={e => setNewHorseLicense(e.target.value)} style={styles.input} />
                  </div>
                )}

                <h4>Disciplíny</h4>
                {pricing.map(d => (
                  <div key={d.id} style={{padding: '10px', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}} onClick={() => {
                    const exists = selectedDisciplines.find(x => x.id === d.id);
                    setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                  }}>
                    {d.discipline_name} - {d.price} Kč
                  </div>
                ))}

                <button onClick={handleRaceRegistration} style={styles.btnPrimary}>ODESLAT PŘIHLÁŠKU</button>

                {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                  <div style={{marginTop: '30px'}}>
                    <h4>Moje starty</h4>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <tbody>
                        {allRegistrations.filter(r => r.user_id === user?.id).map(r => (
                          <tr key={r.id} style={{borderBottom: '1px solid #ccc'}}>
                            <td style={{padding: '5px'}}>{r.discipline}</td>
                            <td style={{padding: '5px'}}>Záda: {r.start_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
  superAdminBar: { background: '#000', color: '#fff', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px', marginBottom: '20px' },
  tab: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' },
  activeTab: { background: '#4caf50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold' },
  brandHeader: { textAlign: 'center', marginBottom: '20px' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', gap: '20px', maxWidth: '1100px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037', height: 'fit-content' },
  adminSection: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #5d4037', color: '#0277bd', borderRadius: '6px', cursor: 'pointer' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnSignOut: { padding: '10px 15px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '15px', width: '100%' }
};
