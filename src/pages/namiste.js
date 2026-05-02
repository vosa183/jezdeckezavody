/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NaMiste() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);

  // Údaje z formuláře
  const [selectedEvent, setSelectedEvent] = useState('');
  const [riderName, setRiderName] = useState('');
  const [horseName, setHorseName] = useState('');
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [riderEmail, setRiderEmail] = useState('');
  const [hasPaid, setHasPaid] = useState(true);

  // Filtrace cen (stejná jako u hráčů)
  const filteredPricing = pricing.filter(p => {
    if (riderAgeCategory === '18+') {
      const n = p.discipline_name.toLowerCase();
      return !n.includes('mládež') && !n.includes('děti') && !n.includes('rookies');
    }
    return true; 
  }).sort((a, b) => a.discipline_name.localeCompare(b.discipline_name, 'cs'));

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', authUser.id).single();
        if (prof?.role === 'admin' || prof?.role === 'superadmin') {
          setIsAuthorized(true);
          await loadData();
        } else {
          window.location.href = '/kone'; 
        }
      } else {
        window.location.href = '/kone';
      }
    } finally { 
      setLoading(false); 
    }
  }

  async function loadData() {
    const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
    setEvents(evts || []);

    const { data: prices } = await supabase.from('pricing').select('*').order('id');
    setPricing(prices || []);

    const { data: regs } = await supabase.from('race_participants').select('start_number, event_id');
    setAllRegistrations(regs || []);
  }

  const toggleDiscipline = (disc) => {
    const exists = selectedDisciplines.find(d => d.id === disc.id);
    if (exists) {
      setSelectedDisciplines(selectedDisciplines.filter(d => d.id !== disc.id));
    } else {
      setSelectedDisciplines([...selectedDisciplines, disc]);
    }
  };

  const handleRegisterOnSite = async (e) => {
    e.preventDefault();
    
    if (!selectedEvent || !riderName.trim() || !horseName.trim() || selectedDisciplines.length === 0) {
      alert('Vyplňte jméno jezdce, koně, závod a alespoň jednu disciplínu!');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Zjistíme, jestli máme zadat e-mail nebo vytvořit falešný, aby mohl být vytvořen účet.
      const finalEmail = riderEmail.trim() || `namiste_${Date.now()}@jezdeckeimperium.cz`;
      const generatedPassword = Math.random().toString(36).slice(-8); // Rychlé heslo
      
      let targetUserId = null;

      // Zkusíme najít uživatele v profilech (přes admin API, pokud by šlo, nebo si vystačíme s falešným ID)
      // Protože jsme admin, nemůžeme tu zakládat reálné auth účty přes signIn/signUp, to by nás to odhlásilo.
      // Řešení na místě: Použijeme tvé ADMIN ID jako "zástupce" (proxy), 
      // protože na startce záleží hlavně na jménu jezdce (rider_name).
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      targetUserId = currentUser.id; 

      // 2. Přidělení startovního čísla
      const selectedEventObj = events.find(ev => ev.id === selectedEvent);
      const fromNum = selectedEventObj?.start_num_from || 1;
      const toNum = selectedEventObj?.start_num_to || 200;
      const capacity = toNum - fromNum + 1;

      const eventRegs = allRegistrations.filter(r => r.event_id === selectedEvent);
      const takenNumbers = eventRegs.map(t => t.start_number);
      const available = Array.from({ length: capacity }, (_, i) => i + fromNum).filter(n => !takenNumbers.includes(n));
      
      if (available.length === 0) {
        alert("Kapacita čísel je plná!");
        setIsProcessing(false);
        return;
      }
      
      const assignedNumber = available[0]; // Vezme nejmenší volné číslo

      // 3. Uložení přihlášek do databáze
      const registrationData = selectedDisciplines.map((d) => {
        return {
          user_id: targetUserId, // Admin ID zástupce
          event_id: selectedEvent,
          rider_name: riderName.trim(),
          age_category: riderAgeCategory,
          horse_name: horseName.trim(),
          discipline: d.discipline_name,
          start_number: assignedNumber,
          draw_order: null, 
          price: d.price,
          is_paid: hasPaid,
          payment_note: hasPaid ? 'Placeno na místě' : 'DLUŽÍ'
        };
      });

      const { error } = await supabase.from('race_participants').insert(registrationData);

      if (error) {
        alert('Chyba zápisu: ' + error.message);
      } else {
        alert(`ÚSPĚCH! Jezdec ${riderName.trim()} má startovní číslo: ${assignedNumber}`);
        
        // Reset formuláře pro dalšího člověka
        setRiderName('');
        setHorseName('');
        setSelectedDisciplines([]);
        setRiderEmail('');
        await loadData();
      }

    } catch (err) {
      alert('Došlo k chybě: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div style={styles.loader}>Ověřuji štáb...</div>;
  if (!isAuthorized) return <div style={styles.loader}>Přístup odepřen.</div>;

  const totalPrice = selectedDisciplines.reduce((sum, d) => sum + d.price, 0);

  return (
    <div style={styles.container}>
      <Head><title>Registrace na místě | Štáb</title></Head>

      <div style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>🎪 Registrace na místě</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět na přehled</button>
      </div>

      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderTop: '5px solid #e65100' }}>
          <h2 style={{ color: '#e65100', marginTop: 0 }}>Nový jezdec u stánku</h2>
          <p style={{ color: '#666', marginBottom: '25px' }}>Tento formulář slouží pro okamžité zařazení jezdce na startovní listinu a do fronty k rozhodčímu bez nutnosti vytvářet mu plný uživatelský profil.</p>

          <form onSubmit={handleRegisterOnSite}>
            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <label style={styles.label}>1. Výběr závodu:</label>
              <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={styles.input} required>
                <option value="">-- Zvolte aktuální závod --</option>
                {events.filter(e => !e.is_locked).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={styles.label}>Jméno jezdce *</label>
                <input type="text" value={riderName} onChange={e => setRiderName(e.target.value)} style={styles.input} required placeholder="Jan Novák" />
              </div>
              <div>
                <label style={styles.label}>Jméno koně *</label>
                <input type="text" value={horseName} onChange={e => setHorseName(e.target.value)} style={styles.input} required placeholder="Můj Kůň" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={styles.label}>Věková kategorie *</label>
                <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={styles.input}>
                  <option value="18+">18+ (Dospělý)</option>
                  <option value="<18">Méně než 18 let</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>E-mail jezdce (Nepovinné)</label>
                <input type="email" value={riderEmail} onChange={e => setRiderEmail(e.target.value)} style={styles.input} placeholder="pro zaslání výsledků..." />
              </div>
            </div>

            <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', border: '1px solid #c8e6c9', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#2e7d32' }}>2. Výběr disciplín</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {filteredPricing.map(d => {
                  const isSelected = selectedDisciplines.find(x => x.id === d.id);
                  return (
                    <div 
                      key={d.id} 
                      onClick={() => toggleDiscipline(d)}
                      style={{ 
                        padding: '10px', borderRadius: '6px', cursor: 'pointer', border: isSelected ? '2px solid #4caf50' : '1px solid #ccc', 
                        background: isSelected ? '#c8e6c9' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                      }}
                    >
                      <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{d.discipline_name}</span>
                      <strong style={{ color: '#2e7d32' }}>{d.price} Kč</strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #ff9800', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={hasPaid} onChange={e => setHasPaid(e.target.checked)} style={{ width: '25px', height: '25px' }} />
                  Penězokaz (ZAPLACENO HOTOVĚ)
                </label>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#e65100' }}>
                {totalPrice} Kč
              </div>
            </div>

            <button type="submit" disabled={isProcessing} style={{ ...styles.btnPrimary, background: isProcessing ? '#888' : '#e65100', fontSize: '1.3rem', padding: '20px' }}>
              {isProcessing ? 'ZAPISUJI NA STARTKU...' : '✅ PŘIDAT JEZDCE NA STARTKU'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#e65100' },
  topNav: { display: 'flex', background: '#212121', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px' },
  input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' },
  btnPrimary: { width: '100%', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 'bold' }
};
