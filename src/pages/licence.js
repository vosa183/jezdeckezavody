/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SpravaLicenci() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myClub, setMyClub] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isClient, setIsClient] = useState(false); // Fix pro Next.js Hydration error

  useEffect(() => { 
    setIsClient(true);
    checkUser(); 
  }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        if (prof?.club_id) {
          const { data: clubData } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single();
          setMyClub(clubData);
          
          // Ověření, zda je majitel
          const { data: myMemberRec } = await supabase.from('club_members').select('role').eq('club_id', prof.club_id).eq('user_id', authUser.id).single();
          if (!myMemberRec || myMemberRec.role !== 'owner') {
            window.location.href = '/kone'; // Přesměrovat, pokud není majitel
          }
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

  const handleApplyLicense = async (e) => {
    e.preventDefault();
    const key = licenseKeyInput.trim(); 
    if (!key) return;
    
    const { data: keyData, error: keyErr } = await supabase.from('license_keys').select('*').eq('key_code', key).single();
    if (keyErr || !keyData) return alert('Tento licenční klíč neexistuje nebo je neplatný.');
    if (keyData.is_used) return alert('Tento licenční klíč již byl použit.');
    
    const now = new Date(); 
    const currentValidUntil = myClub.license_valid_until ? new Date(myClub.license_valid_until) : now;
    const startDate = currentValidUntil > now ? currentValidUntil : now;
    startDate.setMonth(startDate.getMonth() + keyData.duration_months);
    
    await supabase.from('clubs').update({ license_valid_until: startDate.toISOString() }).eq('id', myClub.id);
    await supabase.from('license_keys').update({ is_used: true }).eq('id', keyData.id);
    
    alert(`Gratulujeme! Vaše licence byla úspěšně prodloužena do ${startDate.toLocaleDateString('cs-CZ')}.`); 
    setLicenseKeyInput(''); 
    window.location.reload();
  };

  const handleContactSupport = async () => {
    try {
      alert('Odesílám žádost o novou licenci na centrálu...');
      await fetch('/api/send-email', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          subject: `Žádost o nákup licence - ${myClub?.name}`, 
          text: `Uživatel: ${profile?.email}\nStáj: ${myClub?.name}\n\nMá zájem o prodloužení licence v systému.`, 
          emails: ['l.vosika@arastea.cz'] 
        }) 
      });
      alert('Vaše žádost byla odeslána. Brzy se vám ozveme s fakturou.');
    } catch (err) { 
      alert('Chyba odeslání. Kontaktujte prosím přímo l.vosika@arastea.cz'); 
    }
  };

  if (loading || !isClient) return <div style={styles.loader}>Načítám trezor s licencemi...</div>;

  const now = new Date();
  const trialEnd = myClub?.trial_ends_at ? new Date(myClub.trial_ends_at) : null;
  const licenseEnd = myClub?.license_valid_until ? new Date(myClub.license_valid_until) : null;
  
  let statusText = ''; let statusColor = ''; let daysLeft = 0;
  
  if (licenseEnd && licenseEnd > now) { 
    statusText = `Aktivní licence (platí do ${licenseEnd.toLocaleDateString('cs-CZ')})`; 
    statusColor = '#2e7d32'; 
  } else if (trialEnd && trialEnd > now) { 
    daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)); 
    statusText = `Zkušební verze (zbývá ${daysLeft} dní)`; 
    statusColor = '#f57f17'; 
  } else { 
    statusText = 'Vaše licence vypršela'; 
    statusColor = '#d32f2f'; 
  }

  return (
    <div style={styles.container}>
      <Head><title>Správa Licence | Jezdecké Impérium</title></Head>

      <div style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>🔑 Správa licencí a předplatného</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět do stáje</button>
      </div>

      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
        
        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: `5px solid ${statusColor}` }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Stav účtu: {myClub?.name}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', background: '#fafafa', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: statusColor }}></div>
            <strong style={{ color: statusColor, fontSize: '1.1rem' }}>{statusText}</strong>
          </div>

          <h3 style={{ margin: '0 0 15px 0', color: '#5d4037' }}>Mám licenční klíč</h3>
          <form onSubmit={handleApplyLicense} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="Vložte kód ve formátu LIC-XXXX-XXXX" 
              value={licenseKeyInput} 
              onChange={e => setLicenseKeyInput(e.target.value.toUpperCase())} 
              style={styles.input} 
              required 
            />
            <button type="submit" style={{ ...styles.btnPrimary, background: '#4caf50', padding: '0 25px' }}>
              Ověřit a prodloužit
            </button>
          </form>

          <h3 style={{ margin: '0 0 15px 0', color: '#5d4037', borderTop: '1px solid #eee', paddingTop: '20px' }}>Koupit prodloužení</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
            Zaplaťte rovnou online kartou, nebo nám napište a my vám zašleme fakturu pro převod.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button disabled style={{ background: '#f5f5f5', border: '1px dashed #ccc', color: '#888', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'not-allowed' }}>
              💳 Přejít na platební bránu (Připravujeme)
            </button>
            <button onClick={handleContactSupport} style={{ background: '#e3f2fd', border: '1px solid #90caf9', color: '#0288d1', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              ✉️ Kontaktovat podporu a požádat o fakturu
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#5d4037' },
  topNav: { display: 'flex', background: '#3e2723', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  input: { padding: '12px 15px', borderRadius: '8px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box', fontSize: '1rem' },
  btnPrimary: { color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }
};
