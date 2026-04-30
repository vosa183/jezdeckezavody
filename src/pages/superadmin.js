/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SuperadminPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [clubs, setClubs] = useState([]);
  const [adminGenEmail, setAdminGenEmail] = useState('');
  const [adminGenDuration, setAdminGenDuration] = useState('12');

  // NOVÉ STAVY PRO INDIVIDUÁLNÍ NASTAVENÍ (MODAL)
  const [pricingModalClub, setPricingModalClub] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [maxHorses, setMaxHorses] = useState('');

  useEffect(() => { 
    checkAdmin(); 
  }, []);

  async function checkAdmin() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', authUser.id).single();
        if (prof?.role === 'superadmin') {
          setUser(authUser);
          setIsAuthorized(true);
          await fetchClubs();
        } else {
          window.location.href = '/kone'; // Vykopne běžného smrtelníka
        }
      } else {
        window.location.href = '/kone';
      }
    } finally { 
      setLoading(false); 
    }
  }

  async function fetchClubs() {
    const { data: clubsData } = await supabase.from('clubs').select('*').order('created_at', { ascending: false });
    const { data: ownersData } = await supabase.from('club_members').select('club_id, profiles(email, full_name)').eq('role', 'owner');
    
    if (clubsData && ownersData) {
      const merged = clubsData.map(c => {
        const owner = ownersData.find(o => o.club_id === c.id);
        return { 
          ...c, 
          owner_email: owner?.profiles?.email || 'Neznámý',
          owner_name: owner?.profiles?.full_name || 'Neznámý'
        };
      });
      setClubs(merged);
    } else {
      setClubs(clubsData || []);
    }
  }

  const handleGenerateLicenseKey = async (e) => {
    e.preventDefault();
    const keyCode = `LIC-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const duration = parseInt(adminGenDuration) || 12;
    
    const { error } = await supabase.from('license_keys').insert([{ 
      key_code: keyCode, 
      duration_months: duration, 
      is_used: false 
    }]);
    
    if (error) return alert('Chyba DB: ' + error.message);
    
    try {
      await fetch('/api/send-email', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          subject: 'Licenční klíč', 
          text: `Zde je váš přístup do Jezdeckého Impéria:\n\nKLÍČ: ${keyCode}`, 
          emails: [adminGenEmail] 
        }) 
      });
      alert(`Klíč ${keyCode} byl úspěšně odeslán.`); 
      setAdminGenEmail('');
    } catch (err) { 
      alert(`Klíč vygenerován: ${keyCode}, ale e-mail se nepodařilo odeslat.`); 
    }
  };

  const handleCustomPricing = (club) => {
    setPricingModalClub(club);
    setCustomPrice(club.custom_price || '');
    setMaxHorses(club.max_horses || 50);
  };

  const saveCustomPricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clubs').update({
      custom_price: customPrice ? parseInt(customPrice) : null,
      max_horses: parseInt(maxHorses) || 50
    }).eq('id', pricingModalClub.id);

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      alert('Individuální nastavení úspěšně uloženo!');
      setPricingModalClub(null);
      fetchClubs();
    }
  };

  if (loading) return <div style={styles.loader}>Ověřuji oprávnění velitelství...</div>;
  if (!isAuthorized) return <div style={styles.loader}>Přístup odepřen.</div>;

  return (
    <div style={styles.container}>
      <Head><title>Velín | Superadmin</title></Head>

      <div style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>👑 Velín Superadmina</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět do stáje</button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        
        {/* SEKCE GENERÁTORU */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: '5px solid #0288d1' }}>
          <h2 style={{ color: '#0288d1', margin: '0 0 20px 0' }}>🔑 Vystavit novou licenci</h2>
          <form onSubmit={handleGenerateLicenseKey} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: '250px' }}>
              <label style={styles.formLabel}>E-mail zákazníka</label>
              <input type="email" value={adminGenEmail} onChange={e => setAdminGenEmail(e.target.value)} style={styles.input} required />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={styles.formLabel}>Platnost</label>
              <select value={adminGenDuration} onChange={e => setAdminGenDuration(e.target.value)} style={styles.input}>
                <option value="1">1 měsíc</option>
                <option value="6">6 měsíců</option>
                <option value="12">12 měsíců (1 rok)</option>
              </select>
            </div>
            <button type="submit" style={{ ...styles.btnPrimary, background: '#0288d1', height: '42px', padding: '0 25px' }}>
              Vygenerovat & Odeslat
            </button>
          </form>
        </div>

        {/* SEKCE SPRÁVY KLIENTŮ A CEN */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#e65100', margin: '0 0 20px 0' }}>🏢 Správa klientů a nastavení pod kapotou</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '15px' }}>Stáj / Klub</th>
                  <th style={{ padding: '15px' }}>Zodpovědná osoba</th>
                  <th style={{ padding: '15px' }}>Stav licence</th>
                  <th style={{ padding: '15px' }}>Konec platnosti</th>
                  <th style={{ padding: '15px' }}>SaaS Nastavení</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map(c => {
                  const now = new Date();
                  const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null;
                  const licenseEnd = c.license_valid_until ? new Date(c.license_valid_until) : null;
                  
                  let status = <span style={{ color: 'red', fontWeight: 'bold' }}>Vypršela</span>;
                  if (licenseEnd && licenseEnd > now) status = <span style={{ color: 'green', fontWeight: 'bold' }}>Placená</span>;
                  else if (trialEnd && trialEnd > now) status = <span style={{ color: 'orange', fontWeight: 'bold' }}>Trial</span>;

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>
                        {c.name}
                        {c.custom_price && <div style={{ fontSize: '0.8rem', color: '#e65100', marginTop: '4px' }}>Cena: {c.custom_price} Kč</div>}
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Limit koní: {c.max_horses || 50}</div>
                      </td>
                      <td style={{ padding: '15px', color: '#555' }}>
                        {c.owner_name}<br/>
                        <span style={{ fontSize: '0.8rem', color: '#0288d1' }}>{c.owner_email}</span>
                      </td>
                      <td style={{ padding: '15px' }}>{status}</td>
                      <td style={{ padding: '15px', fontSize: '0.9rem' }}>
                        {c.license_valid_until ? new Date(c.license_valid_until).toLocaleDateString('cs-CZ') : 'Nikdy'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <button 
                          onClick={() => handleCustomPricing(c)} 
                          style={{ background: '#fff', border: '1px solid #e65100', color: '#e65100', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', transition: 'background 0.2s' }}
                          onMouseOver={e => e.target.style.background = '#fff3e0'}
                          onMouseOut={e => e.target.style.background = '#fff'}
                        >
                          ⚙️ Ceny & Moduly
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL OKNO PRO NASTAVENÍ CENY A LIMITŮ */}
      {pricingModalClub && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e65100', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#e65100' }}>Nastavení pro: {pricingModalClub.name}</h3>
              <button onClick={() => setPricingModalClub(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            
            <form onSubmit={saveCustomPricing} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={styles.formLabel}>Individuální cena licence (Kč / Měsíc)</label>
                <input 
                  type="number" 
                  placeholder="Např. 990 (Nechte prázdné pro standard)" 
                  value={customPrice} 
                  onChange={e => setCustomPrice(e.target.value)} 
                  style={styles.input} 
                />
                <small style={{ color: '#888' }}>Nechte prázdné, pokud stáj platí standardní ceníkovou cenu.</small>
              </div>

              <div>
                <label style={styles.formLabel}>Maximální povolený počet koní</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Výchozí je 50" 
                  value={maxHorses} 
                  onChange={e => setMaxHorses(e.target.value)} 
                  style={styles.input} 
                  required
                />
                <small style={{ color: '#888' }}>Kolik koní si majitel může do systému celkem přidat.</small>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" style={{ ...styles.btnPrimary, background: '#e65100', flex: 1, margin: 0 }}>Uložit nastavení</button>
                <button type="button" onClick={() => setPricingModalClub(null)} style={{ background: '#f5f5f5', border: '1px solid #ccc', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Zrušit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif', position: 'relative' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#333' },
  topNav: { display: 'flex', background: '#212121', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box', fontSize: '1rem' },
  formLabel: { fontSize: '0.85rem', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '5px' },
  btnPrimary: { color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }
};
