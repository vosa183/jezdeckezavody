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

export default function PortalSpikr() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [events, setEvents] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  
  const [showSpeakerResults, setShowSpeakerResults] = useState(false); 
  const [speakerResultDiscipline, setSpeakerResultDiscipline] = useState(''); 
  const [speakerLiveSelectedDiscipline, setSpeakerLiveSelectedDiscipline] = useState(''); 
  
  const lastInternalMsgRef = useRef('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) {
        setEvents(evts);
        const lockedEvent = evts.find(e => e.is_locked);
        
        if (lockedEvent && lockedEvent.internal_message && lockedEvent.internal_message !== lastInternalMsgRef.current) {
          if (lastInternalMsgRef.current !== '') playAlert(); 
          lastInternalMsgRef.current = lockedEvent.internal_message;
        }
      }

      if (profile?.role === 'speaker' || profile?.role === 'superadmin') {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*');
        if (scores) setScoresheets(scores);
      }
    }, 5000); 
    
    return () => clearInterval(interval);
  }, [profile]);

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
        
        if (prof?.role === 'speaker' || prof?.role === 'superadmin') {
          setUser(authUser);
          setProfile(prof);
          
          const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
          setEvents(evts || []);

          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
          
          const { data: scores } = await supabase.from('scoresheets').select('*');
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

  const lockedEvent = events.find(ev => ev.is_locked);
  const speakerEventId = lockedEvent?.id;
  const speakerLiveDiscipline = lockedEvent?.active_discipline;

  useEffect(() => {
    if (!showSpeakerResults && speakerLiveDiscipline && speakerLiveSelectedDiscipline !== speakerLiveDiscipline) {
      setSpeakerLiveSelectedDiscipline(speakerLiveDiscipline);
    }
  }, [speakerLiveDiscipline, showSpeakerResults, speakerLiveSelectedDiscipline]);

  const allSpeakerDisciplines = speakerEventId ? [...new Set(allRegistrations.filter(r => r.event_id === speakerEventId).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs')) : [];
  
  const speakerLiveList = speakerEventId && speakerLiveSelectedDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerLiveSelectedDiscipline).sort((a, b) => {
    if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
    if (a.draw_order !== null) return -1;
    if (b.draw_order !== null) return 1;
    return a.start_number - b.start_number;
  }) : [];

  const speakerResultList = speakerEventId && speakerResultDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerResultDiscipline) : [];

  if (loading) return <div style={styles.loader}>Načítám portál hlasatele...</div>;

  return (
    <div style={styles.container} onClick={unlockAudio}>
      <Head>
        <title>Portál Hlasatele | Jezdecké Impérium</title>
      </Head>
      <style>{mobileStyles}</style>

      {user && (
        <div style={styles.topNav}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>🎙️ Portál Hlasatele</h2>
          </div>
          <button onClick={handleSignOut} style={styles.btnNavOutline}>Odhlásit</button>
        </div>
      )}

      {user && (
        <div style={styles.vysilacka}>
          <div style={{flex: 1}}>
            <strong style={{color: '#f57f17', display: 'block', fontSize: '0.8rem'}}>📳 ŽLUTÁ VYSÍLAČKA (ŠTÁB)</strong>
            <span style={{fontSize: '1.1rem', fontWeight: 'bold'}}>{lockedEvent?.internal_message || "Klid na lince..."}</span>
          </div>
        </div>
      )}

      {!user ? (
        <div style={{...styles.card, maxWidth: '400px', margin: '40px auto', borderTop: '5px solid #8d6e63'}}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>Vstup pro Hlasatele (Spíkra)</h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={{...styles.btnPrimary, background: '#5d4037'}}>VSTOUPIT DO PANELU</button>
          </form>
        </div>
      ) : (
        <div className="main-content" style={{...styles.card, maxWidth: '1200px', margin: '0 auto'}}>
          
          <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
            <h3 style={{marginTop: 0, color: '#5d4037', fontSize: '1.5rem'}}>Pohled Hlasatele</h3>
            
            {speakerEventId && (
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button 
                  onClick={() => setShowSpeakerResults(false)} 
                  style={{...styles.btnSave, background: !showSpeakerResults ? '#0288d1' : '#e0e0e0', color: !showSpeakerResults ? '#fff' : '#333', fontSize: '1.1rem'}}
                >
                  📡 Živá Startka
                </button>
                <button 
                  onClick={() => setShowSpeakerResults(true)} 
                  style={{...styles.btnSave, background: showSpeakerResults ? '#e65100' : '#e0e0e0', color: showSpeakerResults ? '#fff' : '#333', fontSize: '1.1rem'}}
                >
                  🏆 Výsledky k vyhlášení
                </button>
              </div>
            )}
          </div>
          
          {speakerEventId ? (
            <div>
              {!showSpeakerResults ? (
                <div>
                  <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px'}}>
                    <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán závodů:</strong>
                    <span style={{fontSize: '1.2rem', whiteSpace: 'pre-wrap'}}>{lockedEvent?.schedule || 'Plán nebyl zadán'}</span>
                  </div>

                  <div style={{background: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1', marginBottom: '20px'}}>
                    <h2 style={{color: '#0288d1', margin: '0 0 15px 0'}}>📡 Vyberte disciplínu ke sledování</h2>
                    <select 
                      value={speakerLiveSelectedDiscipline} 
                      onChange={e => setSpeakerLiveSelectedDiscipline(e.target.value)} 
                      style={{...styles.input, border: '2px solid #0288d1', fontSize: '1.2rem', padding: '15px'}}
                    >
                      <option value="">-- Zvolte disciplínu --</option>
                      {allSpeakerDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {!speakerLiveSelectedDiscipline ? (
                    <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '2px dashed #ccc'}}>
                      <h2>Vyberte disciplínu výše...</h2>
                      <p>Tady uvidíte v reálném čase, jak rozhodčí hodnotí.</p>
                    </div>
                  ) : (
                    <div style={{marginTop: '30px'}}>
                      <div style={{borderBottom: '3px solid #5d4037', paddingBottom: '15px'}}>
                        <h2 style={{fontSize: '1.8rem', margin: 0, color: '#5d4037'}}>ŽIVĚ: {speakerLiveSelectedDiscipline}</h2>
                      </div>

                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                          <thead>
                            <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.1rem'}}>
                              <th style={{padding: '15px'}}>Draw</th>
                              <th style={{padding: '15px'}}>Číslo</th>
                              <th style={{padding: '15px'}}>Jezdec</th>
                              <th style={{padding: '15px'}}>Kůň</th>
                              <th style={{padding: '15px', textAlign: 'center'}}>Stav</th>
                            </tr>
                          </thead>
                          <tbody>
                            {speakerLiveList.map(r => {
                              const isScored = scoresheets.some(s => s.participant_id === r.id);
                              return (
                                <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.3rem', background: isScored ? '#f1f8e9' : '#fff'}}>
                                  <td style={{padding: '15px', fontWeight: 'bold', color: '#5d4037'}}>{r.draw_order || '-'}</td>
                                  <td style={{padding: '15px', fontWeight: '900', fontSize: '1.5rem'}}>{r.start_number}</td>
                                  <td style={{padding: '15px'}}>{r.rider_name}</td>
                                  <td style={{padding: '15px'}}><strong>{r.horse_name}</strong></td>
                                  <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                    {isScored ? '✅ V CÍLI' : 'ČEKÁ'}
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
              ) : (
                <div>
                  <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #e65100', marginBottom: '20px'}}>
                    <h2 style={{color: '#e65100', margin: '0 0 15px 0'}}>🏆 Vyberte disciplínu k vyhlášení</h2>
                    <select 
                      value={speakerResultDiscipline} 
                      onChange={e => setSpeakerResultDiscipline(e.target.value)} 
                      style={{...styles.input, border: '2px solid #e65100', fontSize: '1.2rem', padding: '15px'}}
                    >
                      <option value="">-- Zvolte disciplínu --</option>
                      {allSpeakerDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {speakerResultDiscipline && (
                    <div style={{marginTop: '20px'}}>
                      <h2 style={{fontSize: '1.8rem', margin: 0, color: '#5d4037', borderBottom: '3px solid #5d4037', paddingBottom: '10px'}}>VÝSLEDKY: {speakerResultDiscipline}</h2>
                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
                          <thead>
                            <tr style={{background: '#fff3e0', textAlign: 'left', fontSize: '1.1rem'}}>
                              <th style={{padding: '15px'}}>Pořadí</th>
                              <th style={{padding: '15px'}}>St. č.</th>
                              <th style={{padding: '15px'}}>Jezdec</th>
                              <th style={{padding: '15px'}}>Kůň</th>
                              <th style={{padding: '15px', textAlign: 'right'}}>Skóre</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const scoredRiders = speakerResultList
                                .map(r => {
                                  const sObj = scoresheets.find(s => s.participant_id === r.id);
                                  const sc = sObj?.score_data?.disqualification ? sObj.score_data.disqualification : (sObj ? Number(sObj.total_score) : -999);
                                  return { ...r, totalScore: sc };
                                })
                                .filter(r => r.totalScore !== -999)
                                .sort((a, b) => {
                                  if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
                                  if (a.draw_order !== null) return -1;
                                  if (b.draw_order !== null) return 1;
                                  if (a.totalScore === 'DQ') return 1;
                                  if (b.totalScore === 'DQ') return -1;
                                  if (a.totalScore === 'OP') return 1;
                                  if (b.totalScore === 'OP') return -1;
                                  return b.totalScore - a.totalScore;
                                });
                                
                              if (scoredRiders.length === 0) return <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center'}}>Zatím nejsou výsledky.</td></tr>;

                              return scoredRiders.map((r, index) => {
                                let medal = '';
                                if(r.totalScore === 'DQ' || r.totalScore === 'OP') medal = '❌';
                                else if(index === 0) medal = '🥇';
                                else if(index === 1) medal = '🥈';
                                else if(index === 2) medal = '🥉';
                                const scoreText = (r.totalScore === 'DQ' || r.totalScore === 'OP') ? r.totalScore : `${r.totalScore} b.`;
                                return (
                                  <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.3rem', background: '#fff'}}>
                                    <td style={{padding: '15px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>{medal} {index + 1}. {r.draw_order ? <span style={{fontSize:'0.9rem', color:'#e65100'}}>(Draw {r.draw_order})</span> : ''}</td>
                                    <td style={{padding: '15px', fontWeight: '900', color: '#5d4037'}}>{r.start_number}</td>
                                    <td style={{padding: '15px'}}>{r.rider_name}</td>
                                    <td style={{padding: '15px'}}>{r.horse_name}</td>
                                    <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: (r.totalScore === 'DQ' || r.totalScore === 'OP') ? 'red' : '#2e7d32'}}>{scoreText}</td>
                                  </tr>
                                )
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>Aktuálně neprobíhá žádný uzamčený závod.</p>
          )}
        </div>
      )}
    </div>
  );
}

const mobileStyles = `
  @media (max-width: 768px) {
    .main-content { padding: 15px !important; width: 100% !important; overflow-x: hidden; }
  }
`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '10px', fontFamily: 'sans-serif' },
  topNav: { display: 'flex', background: '#4e342e', padding: '15px', gap: '10px', marginBottom: '15px', borderRadius: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #d7ccc8', color: '#d7ccc8', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
  vysilacka: { backgroundColor: '#fff9c4', border: '2px solid #fbc02d', borderRadius: '10px', padding: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%', overflowX: 'auto' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', fontSize: '1.1rem' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4', fontSize: '1.2rem', color: '#5d4037', fontWeight: 'bold' }
};
