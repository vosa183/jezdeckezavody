/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Brana() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    checkExistingSession();
  }, []);

  // 1. Zkontrolujeme, jestli už uživatel náhodou není přihlášený (když se vrátí na bránu)
  async function checkExistingSession() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setStatusMessage('Ověřuji vaše oprávnění...');
        await routeUser(authUser.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  }

  // 2. Hlavní routovací mozek - zjistí, kdo jsi a kam patříš
  async function routeUser(userId) {
    try {
      // A. Nejdříve zkontrolujeme globální speciální role z profilu
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
      
      if (profile?.role === 'superadmin') {
        window.location.href = '/superadmin';
        return;
      }
      if (profile?.role === 'judge') {
        window.location.href = '/rozhodci';
        return;
      }
      if (profile?.role === 'speaker') {
        window.location.href = '/spikr';
        return;
      }

      // B. Pokud to je běžný smrtelník, zkontrolujeme jeho role ve stájích
      const { data: memberships } = await supabase.from('club_members').select('role').eq('user_id', userId);
      
      if (memberships && memberships.length > 0) {
        const roles = memberships.map(m => m.role);
        
        // Jdeme podle nejvyšší/nejdůležitější role
        if (roles.includes('owner')) {
          window.location.href = '/kone'; // Majitel stáje
        } else if (roles.includes('vet') || roles.includes('farrier')) {
          window.location.href = '/pece'; // Veterinář a Kovář
        } else if (roles.includes('trainer')) {
          window.location.href = '/trener'; // Trenér
        } else if (roles.includes('collaborator')) {
          window.location.href = '/spolupracovnik'; // Groom / Ošetřovatel
        } else {
          window.location.href = '/jezdec'; // Výchozí fallback (Jezdec / Rider)
        }
      } else {
        // C. Pokud nemá ještě vůbec žádnou stáj (např. čerstvá registrace bez pozvánky)
        // Pošleme ho do /kone, protože tam si může založit "Trial stáj" 
        // nebo tam na něj vyskočí hláška, že čeká na přidání.
        window.location.href = '/kone';
      }
    } catch (error) {
      setStatusMessage('Chyba při směrování. Zkuste to prosím znovu.');
      setLoading(false);
    }
  }

  // 3. Odeslání formuláře (Přihlášení / Registrace)
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('Zpracovávám požadavek...');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        alert(error.message);
        setLoading(false);
        setStatusMessage('');
      } else if (data?.user) {
        setStatusMessage('Registrace úspěšná, vytvářím profil...');
        // Vytvoříme prázdný profil, aby nevybuchla databáze
        await supabase.from('profiles').insert([{ 
          id: data.user.id, 
          email: email, 
          license_type: 'Hobby' 
        }]);
        
        // Zrovna ho přesměrujeme
        await routeUser(data.user.id);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        alert('Chybné přihlášení: ' + error.message);
        setLoading(false);
        setStatusMessage('');
      } else if (data?.user) {
        setStatusMessage('Přihlášení úspěšné, otevírám dveře...');
        await routeUser(data.user.id);
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.spinner}></div>
        <h2 style={{ color: '#5d4037', marginTop: '20px' }}>{statusMessage || 'Otevírám bránu Jezdeckého Impéria...'}</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Head>
        <title>Brána | Jezdecké Impérium</title>
      </Head>
      <style>{globalStyles}</style>

      <div style={styles.heroSection}>
        <div style={styles.glassCard}>
          <div style={styles.header}>
            <div style={styles.logoCircle}>🐎</div>
            <h1 style={styles.title}>Jezdecké Impérium</h1>
            <p style={styles.subtitle}>Jeden systém, všechny role. Vstupte do své stáje.</p>
          </div>

          <form onSubmit={handleAuth} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mailová adresa</label>
              <input 
                type="email" 
                placeholder="vas@email.cz" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={styles.input} 
                required 
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Heslo</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={styles.input} 
                required 
              />
            </div>
            
            <button type="submit" style={styles.btnPrimary}>
              {isSignUp ? 'ZAREGISTROVAT SE A VSTOUPIT' : 'PŘIHLÁSIT SE'}
            </button>
          </form>

          <div style={styles.footer}>
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              style={styles.btnText}
            >
              {isSignUp ? 'Už máte svůj účet? Přihlaste se zde.' : 'Nemáte účet? Založte si jej zdarma.'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Informační panely pod přihlašováním */}
      <div style={styles.infoSection}>
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>🏢 Pro Majitele stájí</h3>
          <p style={styles.infoText}>Spravujte koně, fakturace, licence a celý svůj tým na jednom místě. Vše pod kontrolou.</p>
        </div>
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>🩺 Pro Specialisty</h3>
          <p style={styles.infoText}>Veterináři a kováři mají svůj vlastní portál pro psaní zpráv a vystavování faktur napřímo z mobilu.</p>
        </div>
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>🏆 Pro Závodníky</h3>
          <p style={styles.infoText}>Sledujte své hodnocení, tréninkové deníky a přihlašujte se na vypsané závody jedním kliknutím.</p>
        </div>
      </div>

    </div>
  );
}

const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  body {
    margin: 0;
    padding: 0;
    background-color: #f4ece4;
  }
`;

const styles = {
  container: { 
    minHeight: '100vh', 
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column'
  },
  loaderContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4ece4'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #d7ccc8',
    borderTop: '5px solid #5d4037',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #3e2723 0%, #5d4037 100%)',
    padding: '60px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh'
  },
  glassCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '450px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  logoCircle: {
    width: '70px',
    height: '70px',
    background: '#5d4037',
    color: '#fff',
    fontSize: '2rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px auto',
    boxShadow: '0 4px 10px rgba(93, 64, 55, 0.3)'
  },
  title: {
    margin: '0 0 5px 0',
    color: '#3e2723',
    fontSize: '1.8rem',
    fontWeight: '900'
  },
  subtitle: {
    margin: 0,
    color: '#8d6e63',
    fontSize: '0.9rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#555'
  },
  input: {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  btnPrimary: {
    padding: '16px',
    background: '#5d4037',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'background 0.2s',
    boxShadow: '0 4px 6px rgba(93, 64, 55, 0.2)'
  },
  footer: {
    marginTop: '25px',
    textAlign: 'center',
    borderTop: '1px solid #eee',
    paddingTop: '20px'
  },
  btnText: {
    background: 'none',
    border: 'none',
    color: '#5d4037',
    fontWeight: 'bold',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  infoSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '40px 20px',
    flexWrap: 'wrap',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  infoCard: {
    background: '#fff',
    padding: '25px',
    borderRadius: '12px',
    flex: '1 1 300px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    borderTop: '4px solid #8d6e63'
  },
  infoTitle: {
    margin: '0 0 10px 0',
    color: '#3e2723',
    fontSize: '1.2rem'
  },
  infoText: {
    margin: 0,
    color: '#666',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  }
};
