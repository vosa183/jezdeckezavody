/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PortálPece() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Data pro profesionála
  const [myMemberships, setMyMemberships] = useState([]); // Ve kterých stájích figuruje
  const [clientHorses, setClientHorses] = useState([]); // Koně klientů
  
  // Formulář pro zápis
  const [activeHorseId, setActiveHorseId] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [newLog, setNewLog] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    type: 'Veterinář', 
    notes: '', 
    cost: 0 
  });

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        // Zjistíme, do kterých stájí byl uživatel pozván
        const { data: memberships } = await supabase
          .from('club_members')
          .select('club_id, role, clubs(name)')
          .eq('user_id', authUser.id);
          
        if (memberships && memberships.length > 0) {
          setMyMemberships(memberships);
          const clubIds = memberships.map(m => m.club_id);
          
          // Načteme všechny koně z těchto stájí
          const { data: horses } = await supabase
            .from('horses')
            .select('*')
            .in('club_id', clubIds)
            .order('name', { ascending: true });
            
          setClientHorses(horses || []);
        }
      }
    } finally { setLoading(false); }
  }

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Chybné přihlášení: ' + error.message); 
    else window.location.reload();
    setLoading(false);
  };

  const openLogForm = (horseId, defaultType) => {
    setActiveHorseId(horseId);
    setNewLog({ ...newLog, type: defaultType });
  };

  const submitLog = async (e, clubId) => {
    e.preventDefault();
    let attUrl = null;
    
    // Nahrání faktury / zprávy
    if (docFile) {
      const fExt = docFile.name.split('.').pop();
      const fName = `faktura_${Math.random()}.${fExt}`;
      const { error: upErr } = await supabase.storage.from('horse_docs').upload(fName, docFile);
      if (!upErr) { 
        const { data } = supabase.storage.from('horse_docs').getPublicUrl(fName); 
        attUrl = data.publicUrl; 
      }
    }

    const { error } = await supabase.from('horse_diary').insert([{ 
      horse_id: activeHorseId, 
      club_id: clubId, 
      date: newLog.date, 
      training_type: newLog.type, 
      notes: newLog.notes, 
      cost: newLog.cost, 
      rating: 0, // Veterinář nehodnotí hvězdičkami
      attachment_url: attUrl 
    }]);
    
    if (error) alert(error.message);
    else {
      alert('Záznam byl úspěšně uložen do deníku majitele!');
      setActiveHorseId(null);
      setNewLog({ date: new Date().toISOString().split('T')[0], type: 'Veterinář', notes: '', cost: 0 });
      setDocFile(null);
    }
  };

  if (loading) return <div style={styles.loader}>Připojuji ordinaci...</div>;

  // Seskupení koní podle stájí pro hezčí výpis
  const horsesByClub = myMemberships.map(membership => {
    return {
      clubName: membership.clubs?.name || 'Neznámá stáj',
      clubId: membership.club_id,
      role: membership.role,
      horses: clientHorses.filter(h => h.club_id === membership.club_id)
    };
  });

  return (
    <div style={styles.container}>
      <Head>
        <title>Portál Péče | Veterinář & Kovář</title>
      </Head>

      {user && (
        <div style={styles.topNav}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>🩺 Portál Péče</h2>
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <span style={{color: '#e0f2f1', fontSize: '0.9rem'}}>{profile?.full_name}</span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} style={styles.btnNavOutline}>Odhlásit</button>
          </div>
        </div>
      )}

      {!user ? (
        <div style={{...styles.card, maxWidth: '400px', margin: '60px auto', borderTop: '5px solid #00838f'}}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h1 style={{color: '#00838f', margin: '0 0 10px 0'}}>Vstup pro specialisty</h1>
            <p style={{color: '#666', margin: 0, fontSize: '0.9rem'}}>Přihlaste se pro zobrazení svých pacientů a stájí.</p>
          </div>
          
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <input type="email" placeholder="E-mailová adresa" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>PŘIHLÁSIT DO ORDINACE</button>
          </form>
        </div>
      ) : (
        <div style={styles.mainContent}>
          <div style={{marginBottom: '30px'}}>
            <h1 style={{color: '#006064', margin: '0 0 5px 0'}}>Moji pacienti a klienti</h1>
            <p style={{color: '#555', margin: 0}}>Zde vidíte všechny koně ze stájí, které vás pozvaly do svého týmu.</p>
          </div>

          {horsesByClub.length === 0 ? (
            <div style={styles.emptyState}>
              Zatím vás žádná stáj nepřidala mezi své spolupracovníky.
            </div>
          ) : (
            <div style={styles.grid}>
              {horsesByClub.map((group, idx) => (
                <div key={idx} style={styles.clubCard}>
                  <div style={styles.clubHeader}>
                    <h3 style={{margin: 0, color: '#004d40'}}>🏢 {group.clubName}</h3>
                    <span style={styles.roleBadge}>
                      {group.role === 'vet' ? 'Veterinář' : group.role === 'farrier' ? 'Kovář' : 'Specialista'}
                    </span>
                  </div>
                  
                  {group.horses.length === 0 ? (
                    <p style={{color: '#888', padding: '15px', fontSize: '0.9rem'}}>V této stáji zatím nejsou evidováni žádní koně.</p>
                  ) : (
                    <div style={{padding: '15px'}}>
                      {group.horses.map(horse => {
                        const isFormOpen = activeHorseId === horse.id;
                        
                        return (
                          <div key={horse.id} style={styles.horseItem}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                              <img src={horse.photo_url || 'https://via.placeholder.com/60?text=KŮŇ'} style={styles.horseImage} />
                              <div style={{flex: 1}}>
                                <strong style={{fontSize: '1.1rem', color: '#333'}}>{horse.name}</strong>
                                <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>
                                  Očkování: {horse.vaccination_date ? new Date(horse.vaccination_date).toLocaleDateString() : '?'} | 
                                  Kovář: {horse.farrier_date ? new Date(horse.farrier_date).toLocaleDateString() : '?'}
                                </div>
                              </div>
                              <button onClick={() => openLogForm(horse.id, group.role === 'farrier' ? 'Kovář' : 'Veterinář')} style={styles.btnAction}>
                                + Zapsat úkon
                              </button>
                            </div>

                            {/* Formulář pro zápis zákroku */}
                            {isFormOpen && (
                              <form onSubmit={(e) => submitLog(e, group.clubId)} style={styles.logForm}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                  <h4 style={{margin: 0, color: '#00838f'}}>Nový záznam pro: {horse.name}</h4>
                                  <button type="button" onClick={() => setActiveHorseId(null)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}>×</button>
                                </div>
                                
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                                  <div>
                                    <label style={styles.label}>Datum úkonu</label>
                                    <input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} style={styles.inputSmall} required />
                                  </div>
                                  <div>
                                    <label style={styles.label}>Kategorie</label>
                                    <select value={newLog.type} onChange={e=>setNewLog({...newLog, type:e.target.value})} style={styles.inputSmall}>
                                      <option value="Veterinář">Veterinář</option>
                                      <option value="Zuby">Zuby</option>
                                      <option value="Fyzio">Fyzio / Chiro</option>
                                      <option value="Kovář">Kovář</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{marginBottom: '10px'}}>
                                  <label style={styles.label}>Zpráva / Popis zákroku</label>
                                  <textarea placeholder="Co se dělalo, případná medikace..." value={newLog.notes} onChange={e=>setNewLog({...newLog, notes:e.target.value})} style={{...styles.inputSmall, height: '70px'}} required />
                                </div>

                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px'}}>
                                  <div>
                                    <label style={styles.label}>Cena (Kč) pro majitele</label>
                                    <input type="number" placeholder="Např. 1500" value={newLog.cost || ''} onChange={e=>setNewLog({...newLog, cost:parseInt(e.target.value)||0})} style={styles.inputSmall} />
                                  </div>
                                  <div>
                                    <label style={styles.label}>Lékařská zpráva / Faktura (PDF/JPG)</label>
                                    <input type="file" onChange={e=>setDocFile(e.target.files[0])} style={{...styles.inputSmall, background: '#fff'}} />
                                  </div>
                                </div>

                                <button type="submit" style={{...styles.btnPrimary, width: '100%'}}>
                                  Odeslat majiteli do deníku
                                </button>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#e0f2f1', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#00838f' },
  topNav: { display: 'flex', background: '#006064', padding: '15px 20px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #80deea', color: '#80deea', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' },
  mainContent: { maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: '25px' },
  clubCard: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', border: '1px solid #e0e0e0' },
  clubHeader: { background: '#e0f7fa', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #b2ebf2' },
  roleBadge: { background: '#00838f', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  horseItem: { padding: '15px 0', borderBottom: '1px solid #f0f0f0', margin: '0 15px' },
  horseImage: { width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #b2ebf2' },
  btnAction: { background: '#00838f', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.2s' },
  logForm: { marginTop: '15px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' },
  label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { background: '#00838f', color: '#fff', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
  emptyState: { textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '12px', color: '#888', border: '1px dashed #ccc' }
};
