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

  // POMOCNÁ FUNKCE: Vygeneruje kompletní HTML tabulku Scoresheetu pro Supabase soubor
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
    const cols = Array.from({length: activeCount}, (_, i) => i);

    let html = `<div style="margin-bottom: 40px; font-family: sans-serif; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">`;
    html += `<div style="text-align: center; border-bottom: 2px solid #5d4037; padding-bottom: 10px; margin-bottom: 15px;">`;
    html += `<h3 style="margin: 5px 0 0 0; font-size: 20px; color: #5d4037;">VÝSLEDKY: ${discipline}</h3>`;
    html += `</div>`;

    html += `<div style="overflow-x: auto;">`;
    html += `<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 2px solid #333; font-size: 13px; text-align: center; min-width: 800px;">`;
    
    // THEAD
    html += `<thead style="background-color: #eeeeee;">`;
    html += `<tr>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 8px; width: 40px;">DRAW</th>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 8px; width: 40px;">EXH#</th>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 8px; text-align: left; min-width: 150px;">JEZDEC / KŮŇ</th>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 5px; width: 40px;"></th>`;
    html += `<th colspan="${activeCount}" style="border: 1px solid #333; padding: 8px;">MANÉVRY</th>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 8px; width: 70px;">PENALTY<br/>TOTAL</th>`;
    html += `<th rowspan="2" style="border: 1px solid #333; padding: 8px; width: 80px;">FINAL<br/>SCORE</th>`;
    html += `</tr>`;
    html += `<tr>`;
    printNames.forEach((name, i) => {
      html += `<th style="border: 1px solid #333; padding: 5px; font-size: 11px;">${name || i + 1}</th>`;
    });
    html += `</tr>`;
    html += `</thead>`;

    // TBODY
    html += `<tbody>`;
    scoredRiders.forEach(r => {
      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
      const dqStatus = scoreObj?.score_data?.disqualification;
      const hideScores = dqStatus === 'DQ';
      const displayDraw = dqStatus === 'OP' ? 'OP' : (r.draw_order || '');
      const displayFinal = dqStatus === 'DQ' ? 'DQ' : (scoreObj ? scoreObj.total_score : '');
      const pTotal = scoreObj && !hideScores ? scoreObj.score_data.penalties.reduce((a,b)=> Number(a) + Number(b), 0) : '';

      html += `<tr>`;
      html += `<td rowspan="2" style="border: 1px solid #333; padding: 8px; font-weight: bold;">${displayDraw}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #333; padding: 8px; font-weight: 900; font-size: 16px;">${r.start_number}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #333; padding: 8px; text-align: left;">
                <div style="font-weight: bold; font-size: 14px;">${r.rider_name}</div>
                <div style="font-style: italic; color: #555; font-size: 12px; margin-top: 3px;">${r.horse_name}</div>
               </td>`;
      html += `<td style="border: 1px solid #333; border-bottom: 1px dotted #888; padding: 5px; font-size: 10px; background: #fcfcfc; font-weight: bold;">PENALTY</td>`;
      cols.forEach(i => {
        const pen = (scoreObj && !hideScores && scoreObj.score_data.penalties[i] > 0) ? `-${scoreObj.score_data.penalties[i]}` : '';
        html += `<td style="border: 1px solid #333; border-bottom: 1px dotted #888; padding: 5px; font-weight: bold; color: #d32f2f;">${pen}</td>`;
      });
      html += `<td rowspan="2" style="border: 1px solid #333; padding: 8px; font-weight: bold; color: #d32f2f;">${pTotal > 0 ? `-${pTotal}` : ''}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #333; padding: 8px; font-weight: 900; font-size: 18px; color: ${dqStatus ? '#d32f2f' : '#2e7d32'};">${displayFinal}</td>`;
      html += `</tr>`;

      html += `<tr>`;
      html += `<td style="border: 1px solid #333; padding: 5px; font-size: 10px; background: #fcfcfc; font-weight: bold;">SCORE</td>`;
      cols.forEach(i => {
        let s = '';
        if (scoreObj && !hideScores && scoreObj.score_data.maneuvers[i] !== 0) {
          s = scoreObj.score_data.maneuvers[i] > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i];
        } else if (scoreObj && !hideScores) {
          s = ''; 
        }
        html += `<td style="border: 1px solid #333; padding: 5px; font-weight: bold;">${s}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;

    // Podpis
    html += `<div style="margin-top: 15px; font-size: 13px; display: flex; justify-content: space-between; align-items: flex-end;">`;
    html += `<div><strong>Podpis rozhodčího:</strong><br/><br/><strong style="font-size: 16px; color: #0277bd;">${signatureObj?.judge_name || '______________________'}</strong></div>`;
    html += `<div style="color: #888; font-size: 11px;">Kryptografický podpis SHA-256 evidován v systému.</div>`;
    html += `</div></div>`;

    return html;
  };

  const handleSendAllResults = async () => {
    if (!selectedEvent) return alert("Nejprve vyberte závod!");
    
    if (!confirm('TESTOVACÍ REŽIM: Vygeneruji stránku na Supabase a pošlu odkaz na vosa183@gmail.com. Pokračovat?')) return;

    setIsSendingEmails(true);

    const eventObj = events.find(e => e.id === selectedEvent);
    const eventRegs = allRegistrations.filter(r => r.event_id === selectedEvent);
    const disciplines = [...new Set(eventRegs.map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    const emailsToSend = ['vosa183@gmail.com'];

    // 1. Vytvoříme tělo HTML stránky
    let contentHtml = `
      <div style="max-width: 1000px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px; background: #3e2723; padding: 30px; border-radius: 12px; color: white;">
          <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 2px;">Oficiální výsledky závodů</h1>
          <h2 style="color: #ffb300; margin: 10px 0 0 0;">${eventObj.name}</h2>
          <p style="margin: 10px 0 0 0; color: #ccc;">Níže naleznete originální archy (scoresheety) ze všech disciplín.</p>
        </div>
    `;

    disciplines.forEach(disc => {
      const riders = eventRegs.filter(r => r.discipline === disc).sort((a, b) => {
        const sa = scoresheets.find(s => s.participant_id === a.id);
        const sb = scoresheets.find(s => s.participant_id === b.id);
        const scoreA = sa?.total_score || -999;
        const scoreB = sb?.total_score || -999;
        return scoreB - scoreA;
      });
      contentHtml += generateHtmlTableForEmail(disc, riders);
    });

    contentHtml += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; color: #666;">
          <p>Děkujeme za účast a těšíme se na další starty!</p>
          <strong>Tým JK Sobotka & jezdeckezavody.cz</strong>
        </div>
      </div>
    `;

    const fullHtmlDocument = `<!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Výsledky - ${eventObj.name}</title>
      <style>
        body { background-color: #f4ece4; padding: 20px; font-family: sans-serif; }
        @media (max-width: 768px) {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>`;

    try {
      const fileName = `vysledky_${selectedEvent}_${Date.now()}.html`;
      
      // 2. NAHRÁVÁNÍ DO SUPABASE S VYNUCENÝM FORMÁTEM
      const { error: uploadError } = await supabase.storage.from('patterns').upload(
        fileName, 
        fullHtmlDocument, 
        { 
          contentType: 'text/html; charset=UTF-8', 
          upsert: true 
        }
      );
      
      if (uploadError) {
        throw new Error('Chyba při nahrávání do Supabase: ' + uploadError.message);
      }

      // 3. Získáme veřejný odkaz na nahranou stránku
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 4. Odešleme čistý textový e-mail s odkazem
      const emailText = `Krásný den,\n\ngratulujeme k dokončení závodů "${eventObj.name}"!\n\nKompletní výsledkové archy všech disciplín (včetně hodnocení manévrů od rozhodčího) jsme zpracovali a nahráli pro Vás na tento bezpečný odkaz. Stačí na něj kliknout a výsledky si pohodlně prohlédnout z mobilu i počítače:\n\n👉 ODKAZ NA VÝSLEDKY:\n${publicUrl}\n\nOriginální papírové archy s podpisy rozhodčího jsou k nahlédnutí u pořadatele.\n\nDěkujeme za Vaši účast a skvělou atmosféru. Těšíme se na Vás na dalších závodech!\n\nTým JK Sobotka\njezdeckezavody.cz`;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `[VÝSLEDKY] ${eventObj.name}`,
          text: emailText,
          emails: emailsToSend
        })
      });

      if (response.ok) {
        alert(`TEST ODESLÁN! Výsledky byly vytvořeny a odkaz letí na vosa183@gmail.com.`);
      } else {
        throw new Error('Server pro odeslání e-mailu odmítl požadavek.');
      }
    } catch (err) {
      alert(err.message);
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
                  <th style={{border: '2px solid black', padding: '15px', textAlign: 'center', width: '200px', color: 'black'}}>Kontrola<br/>(Krev/Očk.)</th>
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

          // Pokud tiskneme vyplněné, necháme jen ty se skóre
          if (mode === 'filled') {
            ridersInDiscipline = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
          }

          if (ridersInDiscipline.length === 0) return null;

          // Počet sloupců a názvy manévrů
          let activeCount = 10; 
          let printNames = Array(10).fill('');

          if (mode === 'filled') {
            const signatureObj = scoresheets.find(s => s.participant_id === ridersInDiscipline[0].id);
            const maneuverNames = signatureObj?.score_data?.maneuverNames || Array(20).fill('');
            let maxIndex = 0;
            for(let i=0; i<20; i++){
               if(maneuverNames[i] && maneuverNames[i].trim() !== maxIndex) maxIndex = i + 1;
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
                {mode === 'empty' && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <strong style={{fontSize: '1.1rem', color: 'black'}}>Úloha (Pattern):</strong>
                    <div style={{ borderBottom: '2px dotted black', width: '300px', height: '20px' }}></div>
                  </div>
                )}
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
                    <strong>SHA-256 Otisk:</strong> Generováno systémem jezdeckezavody.cz
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
              <button 
                onClick={() => setPrintType('empty')} 
                style={{ ...styles.btnSelect, background: printType === 'empty' ? '#0277bd' : '#f5f5f5', color: printType === 'empty' ? '#fff' : '#333' }}
              >
                📝 Prázdné archy
              </button>
              <button 
                onClick={() => setPrintType('filled')} 
                style={{ ...styles.btnSelect, background: printType === 'filled' ? '#e65100' : '#f5f5f5', color: printType === 'filled' ? '#fff' : '#333' }}
              >
                🏆 Vyplněné výsledky
              </button>
              <button 
                onClick={() => setPrintType('vet')} 
                style={{ ...styles.btnSelect, background: printType === 'vet' ? '#2e7d32' : '#f5f5f5', color: printType === 'vet' ? '#fff' : '#333' }}
              >
                🐴 Veterinární Přejímka
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button 
              onClick={handlePrint} 
              disabled={!selectedEvent} 
              style={{ ...styles.btnPrimary, flex: 1, opacity: selectedEvent ? 1 : 0.5, fontSize: '1.2rem', padding: '15px' }}
            >
              🖨️ TISKNOUT NA PAPÍR
            </button>
            
            {printType === 'filled' && (
              <button 
                onClick={handleSendAllResults} 
                disabled={!selectedEvent || isSendingEmails} 
                style={{ ...styles.btnPrimary, flex: 1, background: '#e65100', opacity: selectedEvent && !isSendingEmails ? 1 : 0.5, fontSize: '1.2rem', padding: '15px' }}
              >
                {isSendingEmails ? 'Odesílám test...' : '📧 TEST: ODESLAT TABULKY JAKO ODKAZ'}
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

// Magie pro tiskárny - tvrdé zalamování stránek!
const printStyles = `
  @media print {
    @page { size: landscape; margin: 10mm; }
    body, html { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    
    /* Vynucení odskoku na novou stránku za každým obalem */
    .page-break { 
      page-break-after: always !important; 
      break-after: page !important; 
      display: block !important;
      clear: both !important;
    }
    
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
  input: { width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #ccc', boxSizing: 'border-box', fontSize: '1.1rem' },
  btnSelect: { flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  btnPrimary: { width: '100%', background: '#0277bd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }
};
