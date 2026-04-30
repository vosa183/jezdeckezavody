/* eslint-disable */
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const playAlert = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  } catch (e) {
    console.log("Audio alert blocked by browser. User interaction needed.");
  }
};

const sendTelegramMessage = async (text) => {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
  } catch (err) {
    console.error('Chyba při odesílání na Telegram server:', err);
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
    "Skóre se hodnotí od -1.5 (Extrémně špatné) do +1.5 (Výborné). Základní skóre je 70.",
    "Mládež do 14 let: možnost jet cvalové pasáže v klusu za snížený počet bodů."
  ],
  ranch: [
    "Penalta 1: Za otěží, rozpadlý rámec, přílišná pomalost, přerušení chodu do 2 kroků.",
    "Penalta 3: Cval na špatnou nohu, tah za otěže, přerušení ve cvalu, krok/klus > 2 kroky, křižování > 2 kroky, vážné porušení překážky.",
    "Penalta 5: Zjevná neposlušnost (kopání, kousání, vyhazování).",
    "Penalta 10: Nepřirozený vzhled koně (soustavné nepřirozené nesení ocasu).",
    "OP (Off Pattern): Vynechání/nedokončení manévru, použití druhé ruky při jednoručním vedení.",
    "DQ: Kulhavost, nepovolená úprava koně, úmyslné týrání, drilování."
  ],
  trail: [
    "Penalta 1/2: Lehký dotek překážky (tiknutí).",
    "Penalta 1: Úder do překážky, krok mimo překážku (1 nohou), rozdělení nohou u kavalety.",
    "Penalta 3: Špatný chod do 2 kroků, pád překážky, krok mimo 2 a více nohama.",
    "Penalta 5: Odmítnutí překážky, vyhnutí se, puštění branky, sesednutí, hrubá neposlušnost.",
    "DQ: Pád koně nebo jezdce, třetí odmítnutí."
  ],
  reining: [
    "Penalta 1/2: Zpožděná změna o 1 skok, nedotočení/přetočení spinu o 1/8.",
    "Penalta 1: Změna cvalu zpožděná o více než 1 skok, 1/4 kruhu na špatnou nohu, přetočení spinu až o 1/4.",
    "Penalta 2: Zmrznutí ve spinu/rollbacku, klus/krok přes marker místo cvalu.",
    "Penalta 5: Spur stop (použití ostruhy před sedlem), držení se sedla, zjevná neposlušnost."
  ],
  showmanship: [
    "POZOR: Tato disciplína (Showmanship/Horsemanship) se hodnotí od -3 (Extrémně špatné) do +3 (Excelentní)!",
    "Penalizace: Malá = 3 b., Velká = 5 b., Závažná = 10 b.",
    "F&E (Celkový výkon a efektivita): Hodnocení 0 (průměr) až 5 (excelentní)."
  ]
};

const getRulesForDiscipline = (disciplineName) => {
  if (!disciplineName) return disciplineRuleHints.default;
  const nameL = disciplineName.toLowerCase();
  if (nameL.includes('ranch') || nameL.includes('riding')) return disciplineRuleHints.ranch;
  if (nameL.includes('trail')) return disciplineRuleHints.trail;
  if (nameL.includes('reining')) return disciplineRuleHints.reining;
  if (nameL.includes('showmanship') || nameL.includes('horsemanship') || nameL.includes('equitation')) return disciplineRuleHints.showmanship;
  return disciplineRuleHints.default;
};

export default function PortalRozhodci() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [events, setEvents] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuversInputString, setManeuversInputString] = useState('');
  const [maneuverScores, setManeuverScores] = useState([]);
  const [penaltyScores, setPenaltyScores] = useState([]);
  const [maneuverNames, setManeuverNames] = useState([]); 
  const [disciplineManeuverNames, setDisciplineManeuverNames] = useState({}); 
  const [showJudgeHints, setShowJudgeHints] = useState(false);
  const [actualJudgeName, setActualJudgeName] = useState(''); 
  const [disqualification, setDisqualification] = useState(null); 
  
  const [printMode, setPrintMode] = useState(''); 
  const lastInternalMsgRef = useRef('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) {
        setEvents(evts);
        const activeEv = evts.find(e => e.id === judgeEvent) || evts.find(e => e.is_locked);
        if (activeEv && activeEv.internal_message && activeEv.internal_message !== lastInternalMsgRef.current) {
          if (lastInternalMsgRef.current !== '') playAlert(); 
          lastInternalMsgRef.current = activeEv.internal_message;
        }
      }

      if (profile?.role === 'judge' || profile?.role === 'superadmin') {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*').order('scored_at', { ascending: false });
        if (scores) setScoresheets(scores);
      }
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [profile, judgeEvent]);

  const unlockAudio = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
    } catch(e) {}
  };

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        
        if (prof?.role === 'judge' || prof?.role === 'superadmin') {
          setUser(authUser);
          setProfile(prof);
          
          const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
          setEvents(evts || []);

          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
          
          const { data: scores } = await supabase.from('scoresheets').select('*').order('scored_at', { ascending: false });
          setScoresheets(scores || []);
        } else {
          window.location.href = '/kone'; // Vykopne nepovolané
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Chybné přihlášení: ' + error.message); 
    } else {
      window.location.reload();
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode('');
    }, 500); 
  };

  const updateParticipantDraw = async (id, newDraw) => {
    const val = newDraw ? parseInt(newDraw) : null;
    await supabase.from('race_participants').update({ draw_order: val }).eq('id', id);
    checkUser();
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
    
    if(discName && disciplineManeuverNames[discName]) {
        const names = disciplineManeuverNames[discName];
        setManeuversInputString(names.filter(n => n.trim() !== '').join(', '));
    } else {
        setManeuversInputString('');
    }
  };

  const applyManeuversFromString = () => {
      const arr = maneuversInputString.split(',').map(s => s.trim()).filter(s => s !== '');
      if (arr.length > 20) {
          alert('Maximální počet manévrů je 20!');
          return;
      }
      const newNames = Array(20).fill('');
      arr.forEach((n, i) => { newNames[i] = n; });
      setDisciplineManeuverNames(prev => ({...prev, [judgeDiscipline]: newNames}));
      alert(`Uloženo ${arr.length} manévrů pro disciplínu ${judgeDiscipline}.`);
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLÍNA UZAVŘENA</b>\n\nPrávě bylo dokončeno hodnocení disciplíny <b>${discName}</b>. Kompletní výsledky budou k dispozici po ukončení závodů.`);
        alert('Odesláno!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(20).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(20).fill(0));
      setDisqualification(existingScore.score_data.disqualification || null); 
      if (existingScore.score_data.maneuverNames) {
        setManeuverNames(existingScore.score_data.maneuverNames);
      }
    } else {
      setManeuverScores(Array(20).fill(0));
      setPenaltyScores(Array(20).fill(0));
      setDisqualification(null); 
      
      if (disciplineManeuverNames[participant.discipline]) {
        setManeuverNames(disciplineManeuverNames[participant.discipline]);
      } else {
        setManeuverNames(Array(20).fill(''));
      }
    }
  };

  const handleManeuverChange = (index, value) => {
    const newScores = [...maneuverScores];
    newScores[index] = Number(value);
    setManeuverScores(newScores);
  };

  const handleManeuverNameChange = (index, value) => {
    const newNames = [...maneuverNames];
    newNames[index] = value;
    setManeuverNames(newNames);
  };

  const handlePenaltyChange = (index, value) => {
    const newPenalties = [...penaltyScores];
    newPenalties[index] = value === '' ? 0 : Number(value); 
    setPenaltyScores(newPenalties);
  };

  const calculateTotalScore = () => {
    const baseScore = 70;
    const maneuversTotal = maneuverScores.reduce((acc, val) => Number(acc) + Number(val), 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => Number(acc) + Number(val), 0); 
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores, maneuverNames: maneuverNames, disqualification: disqualification };
    
    setDisciplineManeuverNames(prev => ({...prev, [evaluatingParticipant.discipline]: maneuverNames}));

    const timestamp = new Date().toISOString();
    const judgeName = actualJudgeName.trim() || profile?.full_name || 'Neznámý rozhodčí';
    
    const dataToSign = `${evaluatingParticipant.id}-${judgeName}-${timestamp}-${total}-${JSON.stringify(scoreData)}`;
    const hash = await generateHash(dataToSign);

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      judge_name: judgeName,
      scored_at: timestamp,
      signature_hash: hash,
      score_data: scoreData,
      total_score: total
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      alert('Hodnocení bylo úspěšně uloženo a podepsáno!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    return (
      <div className="print-area">
        {disciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádní jezdci.</p>
        ) : (
          disciplines.map(discipline => {
            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => {
              if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
              if (a.draw_order !== null) return -1;
              if (b.draw_order !== null) return 1;
              return a.start_number - b.start_number;
            });
            if(ridersInDiscipline.length === 0) return null;

            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            let currentManeuverNames = disciplineManeuverNames[discipline] || Array(20).fill('');
            if (signatureObj?.score_data?.maneuverNames) {
               currentManeuverNames = signatureObj.score_data.maneuverNames;
            }

            let activeCount = 0;
            for(let i=0; i<20; i++){
               if(currentManeuverNames[i] && currentManeuverNames[i].trim() !== '') activeCount = i + 1;
            }
            if(activeCount === 0) activeCount = 10; 

            const printNames = currentManeuverNames.slice(0, activeCount);
            const cols = Array.from({length: activeCount}, (_, i) => i);
            
            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.8rem', color: 'black' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: 'black', fontSize: '1.4rem' }}>SCORESHEET: {discipline}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                    <strong style={{fontSize: '1.2rem', color: 'black'}}>Úloha (Pattern):</strong>
                    <input type="text" className="print-input" placeholder="Zadejte název úlohy" style={{ border: 'none', borderBottom: '2px dotted black', fontSize: '1.2rem', width: '300px', background: 'transparent', textAlign: 'center', color: 'black' }} />
                  </div>
                </div>
                
                <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem', border: '2px solid black' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>DRAW</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>EXH#</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'left', minWidth: '180px', background: '#e0e0e0', color: 'black' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '40px', fontSize: '0.8rem', background: '#e0e0e0', color: 'black' }}></th>
                      <th colSpan={activeCount} style={{ border: '2px solid black', padding: '10px', textAlign: 'center', background: '#eeeeee', color: 'black' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '80px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>PENALTY<br/>TOTAL</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '90px', textAlign: 'center', fontSize: '1.2rem', background: '#e0e0e0', color: 'black' }}>FINAL<br/>SCORE</th>
                    </tr>
                    <tr>
                      {printNames.map((name, i) => (
                        <th key={i} style={{ border: '2px solid black', padding: '8px', width: '45px', textAlign: 'center', background: '#eeeeee', fontSize: '0.8rem', color: 'black' }}>{name || i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const dqStatus = scoreObj?.score_data?.disqualification;
                      const hideScores = dqStatus === 'DQ'; 
                      const displayDraw = dqStatus === 'OP' ? 'OP' : (r.draw_order || ''); 
                      const displayFinal = dqStatus === 'DQ' ? 'DQ' : (scoreObj ? scoreObj.total_score : ''); 
                      const pTotal = scoreObj && !hideScores ? scoreObj.score_data.penalties.reduce((a,b)=> Number(a) + Number(b), 0) : '';
                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'black' }}>{displayDraw}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: '900', fontSize: '1.3rem', color: 'black' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', borderRight: '2px solid black' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'black' }}>{r.rider_name}</div>
                              <div style={{ color: '#333', fontStyle: 'italic' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', borderRight: '2px solid black', borderBottom: '1px solid #aaa', padding: '6px', fontSize: '0.75rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>PENALTY</td>
                            {cols.map(i => (
                              <td key={`p-${i}`} style={{ border: '1px solid black', borderBottom: '1px solid #aaa', padding: '8px', textAlign: 'center', color: 'black', fontWeight: 'bold', height: '30px' }}>
                                {scoreObj && !hideScores && scoreObj.score_data.penalties[i] > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                              </td>
                            ))}
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', color: 'black', fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: '900', fontSize: '1.5rem', color: 'black' }}>
                              {displayFinal}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', borderRight: '2px solid black', padding: '6px', fontSize: '0.75rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>SCORE</td>
                            {cols.map(i => (
                              <td key={`s-${i}`} style={{ border: '1px solid black', padding: '8px', textAlign: 'center', height: '30px', color: 'black' }}>
                                {scoreObj && !hideScores && scoreObj.score_data.maneuvers[i] !== 0 ? (scoreObj.score_data.maneuvers[i] > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i]) : (scoreObj && !hideScores ? '0' : '')}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '3px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'black' }}><strong>Podpis rozhodčího / Judge's signature:</strong></p>
                    <h3 style={{ margin: '10px 0 5px 0', color: 'black' }}>{signatureObj ? signatureObj.judge_name : '____________________________________'}</h3>
                    <p style={{ margin: '0', fontSize: '0.9rem', color: 'black' }}>Dne: {signatureObj ? new Date(signatureObj.scored_at).toLocaleString('cs-CZ') : '___________________'}</p>
                  </div>
                  {scoredRiders.length > 0 && (
                    <div style={{ flex: 1, textAlign: 'right', background: '#f5f5f5', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>KRYPTOGRAFICKÉ OTISKY HODNOCENÍ (SHA-256)</p>
                      <ul style={{ margin: '0', padding: '0', listStyleType: 'none', fontSize: '0.65rem', color: '#666', textAlign: 'left', display: 'inline-block' }}>
                        {scoredRiders.map(r => {
                          const sObj = scoresheets.find(s => s.participant_id === r.id);
                          return (
                            <li key={r.id} style={{marginBottom: '3px'}}>
                              <strong>St. č. {r.start_number}:</strong> {sObj.signature_hash.substring(0, 20)}...
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    );
  };

  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs')) : [];
  
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => {
    if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
    if (a.draw_order !== null) return -1;
    if (b.draw_order !== null) return 1;
    return a.start_number - b.start_number;
  }) : [];

  if (loading) return <div style={styles.loader}>Načítám portál rozhodčího...</div>;

  return (
    <div style={styles.container} onClick={unlockAudio}>
      <Head>
        <title>Portál Rozhodčího | Jezdecké Impérium</title>
      </Head>
      <style>{mobileStyles}</style>

      {user && (
        <div className="no-print" style={styles.topNav}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>⚖️ Portál Rozhodčího</h2>
          </div>
          <button onClick={handleSignOut} style={styles.btnNavOutline}>Odhlásit</button>
        </div>
      )}

      {user && (
        <div className="no-print" style={styles.vysilacka}>
          <div style={{flex: 1}}>
            <strong style={{color: '#f57f17', display: 'block', fontSize: '0.8rem'}}>📳 ŽLUTÁ VYSÍLAČKA (ŠTÁB)</strong>
            <span style={{fontSize: '1.1rem', fontWeight: 'bold'}}>{events.find(e => e.is_locked || e.id === judgeEvent)?.internal_message || "Klid na lince..."}</span>
          </div>
        </div>
      )}

      {!user ? (
        <div className="no-print" style={{...styles.card, maxWidth: '400px', margin: '40px auto', borderTop: '5px solid #0277bd'}}>
          <h2 style={{textAlign: 'center', color: '#0277bd', marginBottom: '15px'}}>Vstup pro rozhodčí</h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={{...styles.btnPrimary, background: '#0277bd'}}>VSTOUPIT DO PANELU</button>
          </form>
        </div>
      ) : (
        <div className="print-area main-content" style={{...styles.card, maxWidth: '1200px', margin: '0 auto'}}>
          
          <div className={printMode ? 'print-area' : ''}>
            <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
              <h3 style={{margin: 0, color: '#0277bd'}}>Aktivní panel hodnocení</h3>
              <input 
                type="text" 
                placeholder="Oficiální jméno rozhodčího" 
                value={actualJudgeName} 
                onChange={(e) => setActualJudgeName(e.target.value)} 
                style={{...styles.inputSmall, width: '250px', margin: 0, border: '2px solid #0277bd'}}
              />
            </div>
            
            <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
              {!evaluatingParticipant && (
                <div>
                  <label style={styles.label}>Vyberte uzamčený závod k hodnocení:</label>
                  <select style={styles.input} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                    <option value="">-- Zvolte závod --</option>
                    {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>

                  {judgeEvent && (
                    <div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap', marginBottom: '20px'}}>
                        <div style={{flex: 1, minWidth: '200px'}}>
                          <label style={styles.label}>Vyberte disciplínu (Okamžitě se zrcadlí Spíkrovi):</label>
                          <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                            <option value="">-- Zvolte disciplínu --</option>
                            {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        
                        {judgeDiscipline && (
                          <div style={{flex: 2, background: '#e3f2fd', padding: '10px', borderRadius: '6px', border: '1px solid #0277bd', minWidth: '250px'}}>
                            <label style={{...styles.label, marginTop: 0}}>Názvy manévrů (oddělte čárkou):</label>
                            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                              <input 
                                type="text" 
                                placeholder="např: Kruh P, Kruh L, Spin" 
                                value={maneuversInputString} 
                                onChange={e => setManeuversInputString(e.target.value)} 
                                style={{...styles.inputSmall, margin: 0, flex: 1}}
                              />
                              <button onClick={applyManeuversFromString} style={{...styles.btnSave, background: '#0277bd'}}>Nastavit</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {evaluatingParticipant && (() => {
                const isShowmanship = evaluatingParticipant.discipline.toLowerCase().includes('showmanship') || 
                                      evaluatingParticipant.discipline.toLowerCase().includes('horsemanship') || 
                                      evaluatingParticipant.discipline.toLowerCase().includes('equitation');
                let activeCount = 0;
                for(let i=0; i<20; i++){
                   if(maneuverNames[i] && maneuverNames[i].trim() !== '') activeCount = i + 1;
                }
                if(activeCount < 10) activeCount = 10;

                const cols = Array.from({length: activeCount}, (_, i) => i);

                return (
                  <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '2px solid #0277bd', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px'}}>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                      <h2 style={{margin: 0}}>{evaluatingParticipant.discipline}</h2>
                      <h2 style={{margin: 0, color: '#d32f2f'}}>St. č.: {evaluatingParticipant.start_number}</h2>
                    </div>
                    <p style={{fontSize: '1.2rem', margin: 0}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>
                    
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                      <button onClick={() => setShowJudgeHints(!showJudgeHints)} style={{...styles.btnOutline, width: 'auto', margin: 0}}>
                        {showJudgeHints ? 'Skrýt nápovědu' : 'ℹ️ Zobrazit nápovědu k disciplíně'}
                      </button>
                    </div>

                    {showJudgeHints && (
                      <div className="no-print" style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9'}}>
                        <h4 style={{marginTop: 0, color: '#1565c0'}}>Tahák (Pravidla)</h4>
                        <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: '#333', margin: 0}}>
                          {getRulesForDiscipline(evaluatingParticipant.discipline).map((rule, idx) => (
                            <li key={idx} style={{marginBottom: '8px'}}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px'}}>
                      <div>
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry (Název a Skóre)</h4>
                        {cols.map((index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', gap: '10px'}}>
                            <input 
                              type="text" 
                              placeholder={`Manévr ${index + 1}`} 
                              value={maneuverNames[index]} 
                              onChange={(e) => handleManeuverNameChange(index, e.target.value)} 
                              style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: '80px'}} 
                            />
                            <select value={maneuverScores[index]} onChange={(e) => handleManeuverChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '90px', fontWeight: 'bold'}}>
                              {isShowmanship ? (
                                <>
                                  <option value={3}>+3 (Exc)</option>
                                  <option value={2.5}>+2.5</option>
                                  <option value={2}>+2 (V.G.)</option>
                                  <option value={1.5}>+1.5</option>
                                  <option value={1}>+1 (Good)</option>
                                  <option value={0.5}>+0.5</option>
                                  <option value={0}>0 (Avg)</option>
                                  <option value={-0.5}>-0.5</option>
                                  <option value={-1}>-1 (Poor)</option>
                                  <option value={-1.5}>-1.5</option>
                                  <option value={-2}>-2 (V.P.)</option>
                                  <option value={-2.5}>-2.5</option>
                                  <option value={-3}>-3 (E.P.)</option>
                                </>
                              ) : (
                                <>
                                  <option value={1.5}>+1.5 (Exc)</option>
                                  <option value={1}>+1.0 (V.G.)</option>
                                  <option value={0.5}>+0.5 (Good)</option>
                                  <option value={0}>0 (Avg)</option>
                                  <option value={-0.5}>-0.5 (Poor)</option>
                                  <option value={-1}>-1.0 (V.P.)</option>
                                  <option value={-1.5}>-1.5 (E.P.)</option>
                                </>
                              )}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestné body)</h4>
                        {cols.map((index) => (
                          <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', height: '33px'}}>
                            <strong>U manévru {index + 1}</strong>
                            <input 
                              type="number" 
                              min="0" 
                              step="0.5" 
                              value={penaltyScores[index]} 
                              onChange={(e) => handlePenaltyChange(index, e.target.value)} 
                              style={{padding: '5px', width: '60px', borderRadius: '4px', border: '1px solid #d32f2f', textAlign: 'center', color: '#d32f2f', fontWeight: 'bold'}}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{padding: '15px', background: disqualification ? '#ffcdd2' : '#e8f5e9', borderRadius: '8px', textAlign: 'right', border: `2px solid ${disqualification ? 'red' : '#388e3c'}`, marginTop: '10px'}}>
                      <span style={{fontSize: '1.2rem', color: '#000'}}>Základ: 70 | </span>
                      <strong style={{fontSize: '1.5rem', color: disqualification ? 'red' : '#000'}}>CELKOVÉ SKÓRE: {disqualification ? disqualification : calculateTotalScore()}</strong>
                    </div>

                    <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'}}>
                      <button 
                        onClick={() => setDisqualification(disqualification === 'OP' ? null : 'OP')} 
                        style={{ background: disqualification === 'OP' ? 'darkorange' : 'orange', color: 'white', padding: '15px', flex: 1, minWidth: '200px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {disqualification === 'OP' ? 'ZRUŠIT OFF-PATTERN' : '⚠️ OFF-PATTERN (OP)'}
                      </button>
                      <button 
                        onClick={() => setDisqualification(disqualification === 'DQ' ? null : 'DQ')} 
                        style={{ background: disqualification === 'DQ' ? 'darkred' : 'red', color: 'white', padding: '15px', flex: 1, minWidth: '200px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        {disqualification === 'DQ' ? 'ZRUŠIT DISKVALIFIKACI' : '🚨 DISKVALIFIKACE (DQ)'}
                      </button>
                    </div>

                    <div style={{display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap'}}>
                      <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, minWidth: '200px', padding: '15px', fontSize: '1.1rem'}}>Uložit hodnocení vč. Podpisu</button>
                      <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 1, minWidth: '200px', marginTop: 0}}>Zrušit a zpět na listinu</button>
                    </div>
                  </div>
                )
              })()}

              {judgeEvent && judgeDiscipline && !evaluatingParticipant && (
                <div style={{marginTop: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px'}}>
                    <h4 style={{margin: 0, fontSize: '1.4rem'}}>Startovní pořadí: {judgeDiscipline}</h4>
                    <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0, padding: '10px 15px', width: 'auto', border: '2px solid #fbc02d', color: '#fbc02d', background: '#fff9c4'}}>📣 Oznámit konec disciplíny</button>
                  </div>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '1.1rem'}}>
                      <thead>
                        <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                          <th style={{padding: '12px'}}>Draw</th>
                          <th style={{padding: '12px'}}>Záda</th>
                          <th style={{padding: '12px'}}>Jezdec</th>
                          <th style={{padding: '12px'}}>Kůň</th>
                          <th style={{padding: '12px', textAlign: 'center'}}>Stav</th>
                        </tr>
                      </thead>
                      <tbody>
                        {judgeStartList.length > 0 ? judgeStartList.map(r => {
                          const isScored = scoresheets.some(s => s.participant_id === r.id);
                          const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                          const displayScore = scoreObj?.score_data?.disqualification ? scoreObj.score_data.disqualification : scoreObj?.total_score;
                          
                          return (
                            <tr key={r.id} style={{borderBottom: '1px solid #eee', background: evaluatingParticipant?.id === r.id ? '#fff9c4' : (isScored ? '#f1f8e9' : 'transparent')}}>
                              <td style={{padding: '12px', fontWeight: 'bold', color: '#0277bd'}}>
                                <input type="number" defaultValue={r.draw_order || ''} onBlur={e => updateParticipantDraw(r.id, e.target.value)} style={{ width: '70px', padding: '8px', fontWeight: 'bold', border: '2px solid #ccc', borderRadius: '4px', fontSize: '1.1rem' }} />
                              </td>
                              <td style={{padding: '12px', fontWeight: '900', fontSize: '1.4rem'}}>{r.start_number}</td>
                              <td style={{padding: '12px'}}>{r.rider_name}</td>
                              <td style={{padding: '12px'}}>{r.horse_name}</td>
                              <td style={{padding: '12px', textAlign: 'center'}}>
                                {isScored ? (
                                  <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '8px 15px', border: '2px solid #388e3c', color: '#388e3c', fontSize: '1rem', fontWeight: 'bold'}}>Opravit ({displayScore})</button>
                                ) : (
                                  <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd', padding: '10px 20px', fontSize: '1.1rem'}}>Hodnotit</button>
                                )}
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center'}}>Žádní přihlášení jezdci v této disciplíně.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {judgeEvent && !evaluatingParticipant && (
              <div className={printMode === 'scoresheets' ? 'print-area' : 'no-print'} style={{...styles.adminSection, marginTop: '40px', border: printMode ? 'none' : '2px solid #ddd'}}>
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h4 style={{margin: 0, fontSize: '1.2rem'}}>Scoresheety k tisku</h4>
                  <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, width: 'auto', border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Oficiální Scoresheety</button>
                </div>
                {renderPrintableScoresheets(judgeEvent)}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

const mobileStyles = `
  @media print {
    @page { size: portrait; margin: 8mm; }
    body, html { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    .wrc-scoresheet td[rowspan="2"] { font-size: 20px !important; font-weight: 900 !important; }
    .print-area { display: block !important; }
  }
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
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '10px', fontFamily: 'sans-serif' },
  topNav: { display: 'flex', background: '#01579b', padding: '15px', gap: '10px', marginBottom: '15px', borderRadius: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #81d4fa', color: '#81d4fa', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  vysilacka: { backgroundColor: '#fff9c4', border: '2px solid #fbc02d', borderRadius: '10px', padding: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%', overflowX: 'auto' },
  adminSection: { padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', background: '#fafafa', overflowX: 'auto', width: '100%', boxSizing: 'border-box' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' },
  inputSmall: { width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box', margin: '4px 0' },
  label: { fontSize: '0.9rem', fontWeight: 'bold', color: '#0277bd', display: 'block', marginBottom: '5px' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', fontSize: '1.1rem' },
  btnOutline: { width: '100%', padding: '8px', background: 'transparent', border: '1px solid #5d4037', color: '#0277bd', borderRadius: '6px', marginTop: '10px', cursor: 'pointer' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4', fontSize: '1.2rem', color: '#0277bd', fontWeight: 'bold' }
};
