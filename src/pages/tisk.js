/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TiskoveCentrum() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  
  const [events, setEvents] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [allHorses, setAllHorses] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  // Ovládací prvky
  const [selectedEvent, setSelectedEvent] = useState('');
  const [printType, setPrintType] = useState('empty'); // 'empty', 'filled', 'vet'

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  async function checkAuthAndLoadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/kone';
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!['admin', 'superadmin', 'judge', 'speaker'].includes(prof?.role)) {
        window.location.href = '/kone';
        return;
      }

      setIsAuthorized(true);

      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      setEvents(evts || []);

      const { data: regs } = await supabase.from('race_participants').select('*');
      setAllRegistrations(regs || []);

      const { data: scores } = await supabase.from('scoresheets').select('*').order('scored_at', { ascending: false });
      setScoresheets(scores || []);

      const { data: horses } = await supabase.from('horses').select('*');
      setAllHorses(horses || []);

      const { data: profs } = await supabase.from('profiles').select('id, full_name, email');
      setAllProfiles(profs || []);

    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  // POMOCNÁ FUNKCE: Vygeneruje HTML tabulku pro e-mail
  const generateHtmlTableForEmail = (discipline, riders) => {
    const scoredRiders = riders.filter(r => scoresheets.some(s => s.participant_id === r.id));
    if (scoredRiders.length === 0) return "";

    const signatureObj = scoresheets.find(s => s.participant_id === scoredRiders[0].id);
    const maneuverNames = signatureObj?.score_data?.maneuverNames || Array(20).fill('');
    let activeCount = 0;
    for(let i=0; i<20; i++){
       if(maneuverNames[i] && maneuverNames[i].trim() !== '') activeCount = i + 1;
    }
    if(activeCount === 0) activeCount = 10;
    const printNames = maneuverNames.slice(0, activeCount);

    let html = `<h2 style="color: #3e2723; border-bottom: 2px solid #3e2723; padding-bottom: 5px; margin-top: 30px;">VÝSLEDKY: ${discipline}</h2>`;
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: sans-serif; border: 1px solid #000;">`;
    html += `<thead style="background-color: #f5f5f5;">
      <tr>
        <th style="border: 1px solid #000; padding: 10px; text-align: center;">St.č.</th>
        <th style="border: 1px solid #000; padding: 10px; text-align: left;">Jezdec / Kůň</th>
        <th style="border: 1px solid #000; padding: 10px; text-align: center;">Výsledek</th>
      </tr>
    </thead><tbody>`;

    scoredRiders.forEach(r => {
      const sObj = scoresheets.find(s => s.participant_id === r.id);
      const dqStatus = sObj?.score_data?.disqualification;
      const finalScore = dqStatus ? dqStatus : (sObj ? sObj.total_score : '-');
      
      html += `<tr>
        <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 1.1em;">${r.start_number}</td>
        <td style="border: 1px solid #000; padding: 10px;">
          <strong style="font-size: 1.1em;">${r.rider_name}</strong><br/>
          <span style="color: #666; font-style: italic;">${r.horse_name}</span>
        </td>
        <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 1.1em; color: ${dqStatus ? 'red' : '#2e7d32'};">
          ${finalScore} ${dqStatus ? '' : 'b.'}
        </td>
      </tr>`;
    });

    html += `</tbody></table>`;
    return html;
  };

  const handleSendAllResults = async () => {
    if (!selectedEvent) return alert("Nejprve vyberte závod!");
    
    // INFO PRO ADMINA O TESTU
    if (!confirm('TESTOVACÍ REŽIM: Opravdu chcete odeslat kompletní výsledky na testovací adresu vosa183@gmail.com?')) return;

    setIsSendingEmails(true);

    const eventObj = events.find(e => e.id === selectedEvent);
    const eventRegs = allRegistrations.filter(r => r.event_id === selectedEvent);
    const disciplines = [...new Set(eventRegs.map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    // TESTOVACÍ OMEZENÍ - Posíláme pouze na jeden zadaný email
    const emailsToSend = ['vosa183@gmail.com'];

    // Vygenerování pěkného HTML obsahu
    let emailHtml = `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="text-align: center; background-color: #3e2723; padding: 30px;">
          <h1 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Oficiální výsledky</h1>
          <p style="color: #ffb300; margin: 10px 0 0 0; font-size: 1.2em; font-weight: bold;">${eventObj.name}</p>
        </div>
        
        <div style="padding: 30px; background-color: #fff;">
          <p style="font-size: 1.1em;">Krásný den všem jezdcům,</p>
          <p>gratulujeme k dokončení závodů pod Humprechtem! Děkujeme za skvělou atmosféru a sportovní výkony. Níže Vám zasíláme kompletní výsledkovou listinu všech disciplín.</p>
          
          <div style="background-color: #f9f9f9; border-left: 5px solid #3e2723; padding: 15px; margin: 20px 0;">
            <strong>Informace k hodnocení:</strong> Detailní archy s body za jednotlivé manévry a podpisy rozhodčího jsou k nahlédnutí u štábu závodů.
          </div>
    `;

    disciplines.forEach(disc => {
      const riders = eventRegs.filter(r => r.discipline === disc).sort((a, b) => {
        const sa = scoresheets.find(s => s.participant_id === a.id);
        const sb = scoresheets.find(s => s.participant_id === b.id);
        // Jednoduché řazení podle skóre
        const scoreA = sa?.total_score || -999;
        const scoreB = sb?.total_score || -999;
        return scoreB - scoreA;
      });
      emailHtml += generateHtmlTableForEmail(disc, riders);
    });

    emailHtml += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Těšíme se na Vás u dalších startů!</p>
            <p><strong>Tým JK Sobotka</strong><br/><em>Jezdecké Impérium</em></p>
          </div>
        </div>
        <div style="text-align: center; font-size: 0.8em; color: #999; padding: 20px; background-color: #f5f5f5;">
          Zpráva byla odeslána automaticky systémem Jezdecké Impérium.
        </div>
      </div>
    `;

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `[TEST] Oficiální výsledky: ${eventObj.name}`,
          html: emailHtml,
          emails: emailsToSend
        })
      });
      alert(`TEST DOKONČEN! Kompletní výsledky byly odeslány na vosa183@gmail.com.`);
    } catch (err) {
      alert('Chyba při odesílání testu: ' + err.message);
    } finally {
      setIsSendingEmails(false);
    }
  };

  const renderVeterinaryList = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const eventRegs = allRegistrations.filter(r => r.event_id === eventId);
    const uniqueHorsesMap = new Map();
    
    eventRegs.forEach(r => {
      if (!uniqueHorsesMap.has(r.horse_name)) {
        const hDetail = allHorses.find(h => h.name === r.horse_name);
        const ownerProfile = allProfiles.find(p => p.id === hDetail?.owner_id);
        const ownerName = ownerProfile ? ownerProfile.full_name : 'Neznámý';

        uniqueHorsesMap.set(r.horse_name, {
           horseName: r.horse_name,
           ownerName: ownerName,
           idNum: hDetail?.horse_id_number || '-'
        });
      }
    });

    const sortedHorses = Array.from(uniqueHorsesMap.values()).sort((a, b) => a.horseName.localeCompare(b.horseName));

    return (
      <div className="print-area page-break" style={{ position: 'relative', minHeight: '90vh', paddingBottom: '30px' }}>
         <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid black', paddingBottom: '15px' }}>
           <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.8rem', color: 'black' }}>{eventObj.name}</h2>
           <h3 style={{ margin: '5px 0 0 0', color: 'black', fontSize: '1.4rem' }}>VETERINÁRNÍ PŘEJÍMKA</h3>
         </div>
         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', border: '2px solid black' }}>
            <thead>
               <tr style={{ background: '#e0e0e0' }}>
                  <th style={{border: '2px solid black', padding: '15px', textAlign: 'left', color: 'black'}}>Jméno koně</th>
                  <th style={{border: '2px solid black', padding: '15px', textAlign: 'center', width: '250px', color: 'black'}}>Průkaz / ID</th>
                  <th style={{border: '2px solid black', padding: '15px', textAlign: 'left', color: 'black'}}>Majitel</th>
                  <th style={{border: '2px solid black', padding: '15px', textAlign: 'center', width: '200px', color: 'black'}}>Kontrola</th>
               </tr>
            </thead>
            <tbody>
               {sortedHorses.map((h, i) => (
                  <tr key={i}>
                     <td style={{border: '1px solid black', padding: '15px', fontWeight: 'bold', color: 'black'}}>{h.horseName}</td>
                     <td style={{border: '1px solid black', padding: '15px', textAlign: 'center', color: 'black', fontFamily: 'monospace', fontSize: '1.1rem'}}>{h.idNum}</td>
                     <td style={{border: '1px solid black', padding: '15px', color: 'black'}}>{h.ownerName}</td>
                     <td style={{border: '1px solid black', padding: '15px'}}></td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    );
  };

  const renderScoresheets = (eventId, mode) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const eventRegs = allRegistrations.filter(r => r.event_id === eventId);
    const disciplines = [...new Set(eventRegs.map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    if (disciplines.length === 0) {
      return <p className="no-print" style={{color: '#666'}}>V tomto závodě nejsou žádní jezdci.</p>;
    }

    return (
      <div className="print-area">
        {disciplines.map(discipline => {
          let ridersInDiscipline = eventRegs.filter(r => r.discipline === discipline).sort((a, b) => {
            if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
            if (a.draw_order !== null) return -1;
            if (b.draw_order !== null) return 1;
            return a.start_number - b.start_number;
          });

          if (mode === 'filled') {
            ridersInDiscipline = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
          }

          if (ridersInDiscipline.length === 0) return null;

          let activeCount = 10; 
          let printNames = Array(10).fill('');

          if (mode === 'filled') {
            const signatureObj = scoresheets.find(s => s.participant_id === ridersInDiscipline[0].id);
            const maneuverNames = signatureObj?.score_data?.maneuverNames || Array(20).fill('');
            let maxIndex = 0;
            for(let i=0; i<20; i++){
               if(maneuverNames[i] && maneuverNames[i].trim() !== '') maxIndex = i + 1;
            }
            activeCount = maxIndex > 0 ? maxIndex : 10;
            printNames = maneuverNames.slice(0, activeCount);
          }

          const cols = Array.from({length: activeCount}, (_, i) => i);
          
          return (
            <div key={discipline} className="page-break" style={{ position: 'relative', paddingBottom: '20px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '3px solid black', paddingBottom: '10px' }}>
                <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.8rem', color: 'black' }}>{eventObj.name}</h2>
                <h3 style={{ margin: '5px 0 0 0', color: 'black', fontSize: '1.4rem' }}>
                  {mode === 'filled' ? 'VÝSLEDKY: ' : 'SCORESHEET: '} {discipline}
                </h3>
              </div>
              
              <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', border: '2px solid black' }}>
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>DRAW</th>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>EXH#</th>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'left', minWidth: '150px', background: '#e0e0e0', color: 'black' }}>JEZDEC / KŮŇ</th>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '4px', width: '40px', fontSize: '0.7rem', background: '#e0e0e0', color: 'black' }}></th>
                    <th colSpan={activeCount} style={{ border: '2px solid black', padding: '8px', textAlign: 'center', background: '#eeeeee', color: 'black' }}>MANÉVRY</th>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '70px', textAlign: 'center', background: '#e0e0e0', color: 'black', fontSize: '0.8rem' }}>PENALTY<br/>TOTAL</th>
                    <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '80px', textAlign: 'center', fontSize: '1rem', background: '#e0e0e0', color: 'black' }}>FINAL<br/>SCORE</th>
                  </tr>
                  <tr>
                    {printNames.map((name, i) => (
                      <th key={i} style={{ border: '2px solid black', padding: '4px', width: '40px', textAlign: 'center', background: '#eeeeee', fontSize: '0.7rem', color: 'black' }}>{name || i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ridersInDiscipline.map(r => {
                    const scoreObj = mode === 'filled' ? scoresheets.find(s => s.participant_id === r.id) : null;
                    const dqStatus = scoreObj?.score_data?.disqualification;
                    const hideScores = dqStatus === 'DQ';
                    const displayDraw = dqStatus === 'OP' ? 'OP' : (r.draw_order || '');
                    const displayFinal = dqStatus === 'DQ' ? 'DQ' : (scoreObj ? scoreObj.total_score : '');
                    const pTotal = scoreObj && !hideScores ? scoreObj.score_data.penalties.reduce((a,b)=> Number(a) + Number(b), 0) : '';
                    
                    return (
                      <React.Fragment key={r.id}>
                        <tr>
                          <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'black' }}>{displayDraw}</td>
                          <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: '900', fontSize: '1.2rem', color: 'black' }}>{r.start_number}</td>
                          <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', borderRight: '2px solid black' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px', color: 'black' }}>{r.rider_name}</div>
                            <div style={{ color: '#333', fontStyle: 'italic', fontSize: '0.85rem' }}>{r.horse_name}</div>
                          </td>
                          <td style={{ border: '1px solid black', borderRight: '2px solid black', borderBottom: '1px dotted #888', padding: '4px', fontSize: '0.7rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>PENALTY</td>
                          {cols.map(i => (
                            <td key={`p-${i}`} style={{ border: '1px solid black', borderBottom: '1px dotted #888', padding: '4px', textAlign: 'center', color: 'black', fontWeight: 'bold', height: '25px' }}>
                              {scoreObj && !hideScores && scoreObj.score_data.penalties[i] > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                            </td>
                          ))}
                          <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', color: 'black', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {pTotal > 0 ? `-${pTotal}` : ''}
                          </td>
                          <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: '900', fontSize: '1.3rem', color: 'black' }}>
                            {displayFinal}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid black', borderRight: '2px solid black', padding: '4px', fontSize: '0.7rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>SCORE</td>
                          {cols.map(i => (
                            <td key={`s-${i}`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', height: '25px', color: 'black' }}>
                              {scoreObj && !hideScores && scoreObj.score_data.maneuvers[i] !== 0 ? (scoreObj.score_data.maneuvers[i] > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i]) : ''}
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {mode === 'filled' && (
                <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '2px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: 'black' }}><strong>Podpis rozhodčího / Judge's signature:</strong></p>
                    <h3 style={{ margin: '5px 0', color: 'black' }}>
                      {scoresheets.find(s => ridersInDiscipline.some(r => r.id === s.participant_id))?.judge_name || '___________________________'}
                    </h3>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontSize: '0.7rem', color: '#666' }}>
                    <strong>SHA-256 Otisk:</strong> Generováno systémem Jezdecké Impérium
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={styles.loader}>Příprava tiskárny...</div>;
  if (!isAuthorized) return <div style={styles.loader}>Přístup odepřen.</div>;

  return (
    <div style={styles.container}>
      <Head><title>Tiskové Centrum | Štáb</title></Head>
      <style>{printStyles}</style>

      <div className="no-print" style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>🖨️ Tiskové centrum závodů</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět do aplikace</button>
      </div>

      <div className="no-print" style={{ maxWidth: '900px', margin: '20px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#0277bd', borderBottom: '2px solid #e3f2fd', paddingBottom: '10px' }}>Nastavení tisku a test rozesílky</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={styles.label}>1. Vyberte závod:</label>
            <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={styles.input}>
              <option value="">-- Zvolte závod --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>

          <div>
            <label style={styles.label}>2. Co chcete vytisknout?</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setPrintType('empty')} style={{ ...styles.btnSelect, background: printType === 'empty' ? '#0277bd' : '#f5f5f5', color: printType === 'empty' ? '#fff' : '#333' }}>📝 Prázdné archy</button>
              <button onClick={() => setPrintType('filled')} style={{ ...styles.btnSelect, background: printType === 'filled' ? '#e65100' : '#f5f5f5', color: printType === 'filled' ? '#fff' : '#333' }}>🏆 Vyplněné výsledky</button>
              <button onClick={() => setPrintType('vet')} style={{ ...styles.btnSelect, background: printType === 'vet' ? '#2e7d32' : '#f5f5f5', color: printType === 'vet' ? '#fff' : '#333' }}>🐴 Veterina</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={handlePrint} disabled={!selectedEvent} style={{ ...styles.btnPrimary, flex: 1, opacity: selectedEvent ? 1 : 0.5, fontSize: '1.2rem', padding: '15px' }}>🖨️ TISKNOUT NA PAPÍR</button>
            
            {printType === 'filled' && (
              <button onClick={handleSendAllResults} disabled={!selectedEvent || isSendingEmails} style={{ ...styles.btnPrimary, flex: 1, background: '#e65100', opacity: selectedEvent && !isSendingEmails ? 1 : 0.5, fontSize: '1.2rem', padding: '15px' }}>
                {isSendingEmails ? 'Rozesílám test...' : '📧 TEST: POSLAT VŠE NA vosa183@gmail.com'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {selectedEvent && printType === 'empty' && renderScoresheets(selectedEvent, 'empty')}
        {selectedEvent && printType === 'filled' && renderScoresheets(selectedEvent, 'filled')}
        {selectedEvent && printType === 'vet' && renderVeterinaryList(selectedEvent)}
      </div>
    </div>
  );
}

const printStyles = `
  @media print {
    @page { size: landscape; margin: 10mm; }
    body, html { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always !important; break-after: page !important; display: block !important; clear: both !important; }
    table { page-break-inside: auto; width: 100% !important; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    .wrc-scoresheet td[rowspan="2"] { font-size: 16px !important; font-weight: 900 !important; }
  }
`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#0277bd' },
  topNav: { display: 'flex', background: '#212121', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  label: { display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#333', marginBottom: '8px' },
  input: { width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1.1rem' },
  btnSelect: { flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  btnPrimary: { width: '100%', background: '#0277bd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }
};
