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
      
      // STRIKTNÍ OMEZENÍ: Pouze admin a superadmin!
      if (!['admin', 'superadmin'].includes(prof?.role)) {
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

  // POMOCNÁ FUNKCE: Vygeneruje kompletní HTML tabulku pro webovou stránku výsledků
  const generateHtmlTableForWeb = (discipline, riders) => {
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

    let html = `<div style="margin-bottom: 40px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">`;
    html += `<h3 style="margin: 0 0 15px 0; font-size: 20px; color: #3e2723; border-bottom: 2px solid #3e2723; padding-bottom: 5px;">${discipline}</h3>`;
    html += `<div style="overflow-x: auto;">`;
    html += `<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px; text-align: center;">`;
    html += `<thead style="background-color: #f5f5f5;"><tr>`;
    html += `<th rowspan="2" style="border: 1px solid #000;">DRAW</th><th rowspan="2" style="border: 1px solid #000;">EXH#</th>`;
    html += `<th rowspan="2" style="border: 1px solid #000; text-align: left;">JEZDEC / KŮŇ</th><th rowspan="2" style="border: 1px solid #000;"></th>`;
    html += `<th colspan="${activeCount}" style="border: 1px solid #000;">MANÉVRY</th><th rowspan="2" style="border: 1px solid #000;">PENALTY</th><th rowspan="2" style="border: 1px solid #000;">SCORE</th>`;
    html += `</tr><tr>`;
    printNames.forEach((name, i) => { html += `<th style="border: 1px solid #000; font-size: 10px;">${name || i + 1}</th>`; });
    html += `</tr></thead><tbody>`;

    scoredRiders.forEach(r => {
      const sObj = scoresheets.find(s => s.participant_id === r.id);
      const dqStatus = sObj?.score_data?.disqualification;
      const hideScores = dqStatus === 'DQ';
      const displayDraw = dqStatus === 'OP' ? 'OP' : (r.draw_order || '');
      const displayFinal = dqStatus === 'DQ' ? 'DQ' : (scoreObj ? scoreObj.total_score : sObj?.total_score || '');
      const pTotal = sObj && !hideScores ? sObj.score_data.penalties.reduce((a,b)=> Number(a) + Number(b), 0) : '';

      html += `<tr>`;
      html += `<td rowspan="2" style="border: 1px solid #000; font-weight: bold;">${displayDraw}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #000; font-weight: 900; font-size: 16px;">${r.start_number}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #000; text-align: left;"><strong>${r.rider_name}</strong><br/><small>${r.horse_name}</small></td>`;
      html += `<td style="border: 1px solid #000; font-size: 9px; background: #f9f9f9;">PENALTY</td>`;
      cols.forEach(i => {
        const pen = (sObj && !hideScores && sObj.score_data.penalties[i] > 0) ? `-${sObj.score_data.penalties[i]}` : '';
        html += `<td style="border: 1px solid #000; color: red; font-weight: bold;">${pen}</td>`;
      });
      html += `<td rowspan="2" style="border: 1px solid #000; font-weight: bold;">${pTotal > 0 ? pTotal : ''}</td>`;
      html += `<td rowspan="2" style="border: 1px solid #000; font-weight: 900; font-size: 18px;">${displayFinal}</td>`;
      html += `</tr><tr><td style="border: 1px solid #000; font-size: 9px; background: #f9f9f9;">SCORE</td>`;
      cols.forEach(i => {
        let scVal = '';
        if (sObj && !hideScores && sObj.score_data.maneuvers[i] !== 0) {
          scVal = sObj.score_data.maneuvers[i] > 0 ? `+${sObj.score_data.maneuvers[i]}` : sObj.score_data.maneuvers[i];
        }
        html += `<td style="border: 1px solid #000;">${scVal}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    html += `<p style="margin-top: 10px; font-size: 12px;"><strong>Rozhodčí:</strong> ${signatureObj?.judge_name || 'Neuvedeno'}</p></div>`;
    return html;
  };

  const handleSendAllResults = async () => {
    if (!selectedEvent) return alert("Nejprve vyberte závod!");
    if (!confirm('Opravdu chcete vygenerovat webovou stránku s výsledky a poslat odkaz na vosa183@gmail.com?')) return;

    setIsSendingEmails(true);

    const eventObj = events.find(e => e.id === selectedEvent);
    const eventRegs = allRegistrations.filter(r => r.event_id === selectedEvent);
    const disciplines = [...new Set(eventRegs.map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    // TESTOVACÍ ADRESA
    const emailsToSend = ['vosa183@gmail.com'];

    // 1. STAVBA WEBOVÉ STRÁNKY
    let pageHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Výsledky - ${eventObj.name}</title>`;
    pageHtml += `<style>body{font-family:sans-serif;background:#f4ece4;padding:20px;color:#333;} .container{max-width:1000px;margin:0 auto;} .header{text-align:center;background:#3e2723;color:#fff;padding:30px;border-radius:10px;margin-bottom:30px;}</style></head><body><div class="container">`;
    pageHtml += `<div class="header"><h1>VÝSLEDKOVÁ LISTINA</h1><h2>${eventObj.name}</h2><p>Vystaveno dne: ${new Date().toLocaleDateString('cs-CZ')}</p></div>`;

    disciplines.forEach(disc => {
      const riders = eventRegs.filter(r => r.discipline === disc).sort((a, b) => {
        const sa = scoresheets.find(s => s.participant_id === a.id);
        const sb = scoresheets.find(s => s.participant_id === b.id);
        return (sb?.total_score || 0) - (sa?.total_score || 0);
      });
      pageHtml += generateHtmlTableForWeb(disc, riders);
    });

    pageHtml += `<div style="text-align:center;margin-top:50px;color:#888;"><p>Vygenerováno systémem jezdeckezavody.cz</p></div></div></body></html>`;

    try {
      const fileName = `vysledky_${selectedEvent}_${Date.now()}.html`;
      
      // 2. NAHRÁNÍ NA STORAGE S OPRAVOU MIME-TYPU
      const blob = new Blob([pageHtml], { type: 'text/html' });
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, blob, {
        contentType: 'text/html; charset=UTF-8',
        cacheControl: '3600',
        upsert: true
      });

      if (uploadError) throw new Error("Chyba úložiště: " + uploadError.message);

      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 3. ODESLÁNÍ ČISTÉHO EMAILU
      const emailBody = `Dobrý den,\n\ngratulujeme k dokončení závodů "Westernové závody pod Humprechtem"!\n\nKompletní výsledkové listiny a archy se všemi manévry jsme pro Vás nahráli na tento odkaz:\n\n${publicUrl}\n\nOdkaz je platný a výsledky si můžete prohlédnout na mobilu i počítači.\n\nTěšíme se na Vás na příštích závodech!\n\nŠtáb závodů\nwww.jezdeckezavody.cz`;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Výsledky: ${eventObj.name}`,
          text: emailBody, // Posíláme čistý text, server ho už nezmrší
          emails: emailsToSend
        })
      });

      if (response.ok) {
        alert("TEST ÚSPĚŠNÝ! Odkaz na webovou stránku s výsledky byl odeslán na vosa183@gmail.com.");
      } else {
        alert("Stránka se vytvořila, ale e-mail selhal. Odkaz na stránku je: " + publicUrl);
      }
    } catch (err) {
      alert("Chyba: " + err.message);
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
        uniqueHorsesMap.set(r.horse_name, {
           horseName: r.horse_name,
           ownerName: allProfiles.find(p => p.id === hDetail?.owner_id)?.full_name || 'Neznámý',
           idNum: hDetail?.horse_id_number || '-'
        });
      }
    });
    const sortedHorses = Array.from(uniqueHorsesMap.values()).sort((a, b) => a.horseName.localeCompare(b.horseName));
    return (
      <div className="print-area page-break">
         <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid black', paddingBottom: '15px' }}>
           <h2 style={{ margin: '0', textTransform: 'uppercase' }}>WESTERNOVÉ ZÁVODY POD HUMPRECHTEM</h2>
           <h3>VETERINÁRNÍ PŘEJÍMKA</h3>
         </div>
         <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}>
            <thead>
               <tr style={{ background: '#e0e0e0' }}>
                  <th style={{border: '1px solid black', padding: '10px'}}>Kůň</th>
                  <th style={{border: '1px solid black', padding: '10px'}}>Průkaz / ID</th>
                  <th style={{border: '1px solid black', padding: '10px'}}>Majitel</th>
                  <th style={{border: '1px solid black', padding: '10px'}}>Kontrola</th>
               </tr>
            </thead>
            <tbody>
               {sortedHorses.map((h, i) => (
                  <tr key={i}>
                     <td style={{border: '1px solid black', padding: '10px', fontWeight: 'bold'}}>{h.horseName}</td>
                     <td style={{border: '1px solid black', padding: '10px'}}>{h.idNum}</td>
                     <td style={{border: '1px solid black', padding: '10px'}}>{h.ownerName}</td>
                     <td style={{border: '1px solid black', padding: '10px'}}></td>
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

    return (
      <div className="print-area">
        {disciplines.map(discipline => {
          let ridersInDiscipline = eventRegs.filter(r => r.discipline === discipline).sort((a, b) => (a.draw_order || 999) - (b.draw_order || 999));
          if (mode === 'filled') ridersInDiscipline = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
          if (ridersInDiscipline.length === 0) return null;

          return (
            <div key={discipline} className="page-break" style={{ marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, textTransform: 'uppercase' }}>WESTERNOVÉ ZÁVODY POD HUMPRECHTEM</h2>
                <h3 style={{ margin: '5px 0 0 0' }}>{mode === 'filled' ? 'VÝSLEDKY: ' : 'SCORESHEET: '} {discipline}</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '12px' }}>
                <thead style={{ background: '#eee' }}>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '5px' }}>DRAW</th>
                    <th style={{ border: '1px solid black', padding: '5px' }}>#</th>
                    <th style={{ border: '1px solid black', padding: '5px', textAlign: 'left' }}>JEZDEC / KŮŇ</th>
                    <th style={{ border: '1px solid black', padding: '5px' }}>SCORE / FINAL</th>
                  </tr>
                </thead>
                <tbody>
                  {ridersInDiscipline.map(r => {
                    const s = scoresheets.find(sc => sc.participant_id === r.id);
                    return (
                      <tr key={r.id}>
                        <td style={{ border: '1px solid black', textAlign: 'center' }}>{r.draw_order || ''}</td>
                        <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold' }}>{r.start_number}</td>
                        <td style={{ border: '1px solid black', padding: '5px' }}><strong>{r.rider_name}</strong><br/>{r.horse_name}</td>
                        <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold' }}>{s ? (s.score_data?.disqualification || s.total_score) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={styles.loader}>Otevírám trezor...</div>;

  return (
    <div style={styles.container}>
      <Head><title>Tiskové centrum | jezdeckezavody.cz</title></Head>
      <style>{printStyles}</style>

      <div className="no-print" style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>🖨️ Tiskové centrum závodů</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět do aplikace</button>
      </div>

      <div className="no-print" style={{ maxWidth: '800px', margin: '20px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#3e2723', borderBottom: '2px solid #f4ece4', paddingBottom: '10px' }}>Admin Panel: Tisk a Rozesílka</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          <div>
            <label style={styles.label}>1. Vyberte závod:</label>
            <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={styles.input}>
              <option value="">-- Zvolte závod --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>

          <div>
            <label style={styles.label}>2. Typ dokumentu:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setPrintType('empty')} style={{ ...styles.btnSelect, background: printType === 'empty' ? '#3e2723' : '#f5f5f5', color: printType === 'empty' ? '#fff' : '#333' }}>Prázdné Scoresheety</button>
              <button onClick={() => setPrintType('filled')} style={{ ...styles.btnSelect, background: printType === 'filled' ? '#e65100' : '#f5f5f5', color: printType === 'filled' ? '#fff' : '#333' }}>Vyplněné Výsledky</button>
              <button onClick={() => setPrintType('vet')} style={{ ...styles.btnSelect, background: printType === 'vet' ? '#2e7d32' : '#f5f5f5', color: printType === 'vet' ? '#fff' : '#333' }}>Veterinární listina</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button onClick={handlePrint} disabled={!selectedEvent} style={{ ...styles.btnPrimary, flex: 1 }}>🖨️ TISKNOUT NA PAPÍR</button>
            
            {printType === 'filled' && (
              <button onClick={handleSendAllResults} disabled={!selectedEvent || isSendingEmails} style={{ ...styles.btnPrimary, flex: 1, background: '#e65100' }}>
                {isSendingEmails ? 'Pracuji...' : '📧 TEST: POSLAT ODKAZ NA EMAIL'}
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
    @page { size: portrait; margin: 10mm; }
    body, html { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always !important; break-after: page !important; display: block !important; clear: both !important; }
    table { width: 100% !important; border: 2px solid black !important; }
  }
`;

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#3e2723' },
  topNav: { display: 'flex', background: '#212121', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  label: { display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#333', marginBottom: '8px' },
  input: { width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1.1rem' },
  btnSelect: { flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
  btnPrimary: { width: '100%', background: '#3e2723', color: 'white', border: 'none', padding: '18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
