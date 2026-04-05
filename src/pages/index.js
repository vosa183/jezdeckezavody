/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data z databáze
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  
  // Stavy pro hráče
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [editMode, setEditMode] = useState(false);

  // Stavy pro Admina
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');

  // Přepínač rolí
  const [simulatedRole, setSimulatedRole] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', user.id);
        setMyHorses(horses || []);

        const { data: evts } = await supabase.from('events').select('*').eq('is_active', true);
        setEvents(evts || []);

        const { data: prices } = await supabase.from('pricing').select('*').order('id');
        setPricing(prices || []);

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else if (data?.user) {
        // Tady se rovnou zapíše e-mail do profilu v databázi
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        alert('Registrace úspěšná! Můžete vstoupit.');
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.reload();
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      email: profile.email || user.email, // Uložíme e-mail
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { alert('Profil uložen!'); setEditMode(false); }
  };

  // ADMIN FUNKCE
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ name: newEventName, event_date: newEventDate }]);
    if (error) alert(error.message);
    else { alert('Závod vytvořen!'); window.location.reload(); }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice) }]);
    if (error) alert(error.message);
    else { alert('Disciplína přidána do ceníku!'); window.location.reload(); }
  };

  const handleEditPrice = async (id, oldPrice) => {
    const newPrice = prompt("Zadejte novou cenu v Kč:", oldPrice);
    if (newPrice !== null && newPrice !== "") {
      const { error } = await supabase.from('pricing').update({ price: parseInt(newPrice) }).eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const handleDeletePricing = async (id) => {
    if (confirm("Opravdu chcete tuto disciplínu smazat z ceníku?")) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    alert('Poznámka k platbě uložena!');
  };

  // HRÁČ FUNKCE
  const handleRaceRegistration = async () => {
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0) {
      alert("Vyberte závod, koně a aspoň jednu disciplínu.");
      return;
    }

    let finalHorseName = selectedHorse;

    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napište jméno nového koně!");
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName }])
        .select().single();
      if (horseErr) return alert("Chyba při ukládání koně: " + horseErr.message);
      finalHorseName = newHorse.name;
    }

    const { data: takenNumbers } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const taken = takenNumbers?.map(t => t.start_number) || [];
    const available = Array.from({ length: 100 }, (_, i) => i + 1).filter(n => !taken.includes(n));

    if (available.length === 0) {
      alert("Kapacita čísel je vyčerpána!");
      return;
    }

    const assignedNumber = available[Math.floor(Math.random() * available.length)];

    const registrationData = await Promise.all(selectedDisciplines.map(async (d) => {
      const { data: takenDraws } = await supabase.from('race_participants')
        .select('draw_order')
        .eq('event_id', selectedEvent)
        .eq('discipline', d.discipline_name);
        
      const takenDrawOrders = takenDraws?.map(t => t.draw_order) || [];
      const availableDraws = Array.from({ length: 100 }, (_, i) => i + 1).filter(n => !takenDrawOrders.includes(n));
      const assignedDraw = availableDraws[Math.floor(Math.random() * availableDraws.length)];

      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: profile?.full_name || user.email,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: assignedDraw,
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      alert(`Přihláška odeslána! Vaše startovní číslo na záda je: ${assignedNumber}. Pořadí do arény najdete u pořadatele.`);
      window.location.reload();
    }
  };

  if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';

  return (
    <div style={styles.container}>
      {/* PŘEPÍNACÍ LIŠTA PRO ADMINA A SUPERADMINA */}
      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div style={styles.superAdminBar}>
          <strong>{profile?.role === 'superadmin' ? 'SUPERADMIN:' : 'ADMIN:'}</strong> 
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('superadmin')} style={effectiveRole === 'superadmin' ? styles.activeTab : styles.tab}>Superadmin</button>
          )}
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin Pohled</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Rozhodčí Pohled</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hráč Pohled</button>
        </div>
      )}

      <div style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>{isSignUp ? 'Nová registrace' : 'Přihlášení'}</h2>
          <form onSubmit={handleAuth} style={styles.form}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
            <input type="password" placeholder="Heslo (min. 6 znaků)" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
            {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
          </button>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          {/* LEVÝ PANEL - PROFIL */}
          <div style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} type="email" placeholder="Kontaktní e-mail" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                <input style={styles.inputSmall} placeholder="Číslo hospodářství (např. CZ12345678)" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
                <button type="submit" style={styles.btnSave}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>E-mail: {profile?.email || user?.email}</p>
                <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          {/* HLAVNÍ PANEL PODLE ROLE */}
          <div style={styles.card}>
            
            {/* POHLED: ADMIN / SUPERADMIN */}
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <h3 style={{marginTop: 0, borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>Správa Závodů (Admin)</h3>
                
                <div style={styles.adminSection}>
                  <h4 style={{margin: '0 0 10px 0'}}>1. Vypsat nový termín závodů</h4>
                  <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                    <input type="text" placeholder="Název (např. Jarní závody)" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '200px'}} required/>
                    <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                    <button type="submit" style={styles.btnSave}>Přidat Závod</button>
                  </form>
                </div>

                <div style={styles.adminSection}>
                  <h4 style={{margin: '0 0 10px 0'}}>2. Ceník disciplín ({pricing.length})</h4>
                  <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                    <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                    <input type="number" placeholder="Cena Kč" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                    <button type="submit" style={styles.btnSave}>Přidat</button>
                  </form>

                  <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                    <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                      <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                        <tr style={{textAlign: 'left'}}>
                          <th style={{padding: '10px'}}>Disciplína</th>
                          <th style={{padding: '10px', width: '80px'}}>Cena</th>
                          <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricing.map(p => (
                          <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '10px'}}>{p.discipline_name}</td>
                            <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                            <td style={{padding: '10px', textAlign: 'center'}}>
                              <button onClick={() => handleEditPrice(p.id, p.price)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>✎ Edit</button>
                              <button onClick={() => handleDeletePricing(p.id)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>✖ Smazat</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={styles.adminSection}>
                  <h4 style={{margin: '0 0 10px 0'}}>Přihlášení jezdci a startky</h4>
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                      <thead>
                        <tr style={{background: '#eee', textAlign: 'left'}}>
                          <th style={{padding: '8px'}}>Záda</th>
                          <th style={{padding: '8px'}}>Draw</th>
                          <th style={{padding: '8px'}}>Jezdec</th>
                          <th style={{padding: '8px'}}>Kůň</th>
                          <th style={{padding: '8px'}}>Disciplína</th>
                          <th style={{padding: '8px'}}>Poznámka k platbě</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allRegistrations.map((r, i) => (
                          <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                            <td style={{padding: '8px', color: '#0277bd'}}><strong>{r.draw_order || '-'}</strong></td>
                            <td style={{padding: '8px'}}>{r.rider_name}</td>
                            <td style={{padding: '8px'}}>{r.horse_name}</td>
                            <td style={{padding: '8px'}}>{r.discipline}</td>
                            <td style={{padding: '8px'}}>
                              <input 
                                type="text" 
                                defaultValue={r.payment_note || ''} 
                                onBlur={(e) => updatePaymentNote(r.id, e.target.value)} 
                                placeholder="např. Hotově"
                                style={{padding: '5px', width: '100px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* POHLED: ROZHODČÍ */}
            {effectiveRole === 'judge' && (
              <div>
                <h3 style={{marginTop: 0, color: '#0277bd'}}>Rozhodčí panel</h3>
                <p>Zde se brzy objeví digitální scoresheety k hodnocení závodníků.</p>
              </div>
            )}

            {/* POHLED: HRÁČ */}
            {effectiveRole === 'player' && (
              <div>
                <h3 style={{marginTop: 0}}>Nová přihláška k závodu</h3>
                
                <label style={styles.label}>1. Vyberte závod:</label>
                <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">-- Který závod pojedete? --</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString()})</option>)}
                </select>

                <label style={styles.label}>2. Vyberte koně:</label>
                <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně z historie --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Přidat nového koně</option>
                </select>
                {selectedHorse === 'new' && (
                  <input type="text" placeholder="Napište jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, border: '2px solid #8d6e63'}} />
                )}

                <label style={styles.label}>3. Disciplíny (Možno vybrat více):</label>
                {pricing.length === 0 ? <p style={{color: 'red'}}>Admin ještě nevypsal ceník disciplín.</p> : (
                  <div style={styles.disciplineList}>
                    {pricing.map(d => (
                      <div key={d.id} onClick={() => {
                        const exists = selectedDisciplines.find(x => x.id === d.id);
                        setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                      }} style={{...styles.disciplineItem, background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                        {d.discipline_name} <strong>{d.price} Kč</strong>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={styles.priceTag}>
                  Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč
                </div>

                <button onClick={handleRaceRegistration} style={styles.btnSecondary}>ODESLAT PŘIHLÁŠKU</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  superAdminBar: { background: '#000', color: '#fff', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px', marginBottom: '20px', overflowX: 'auto' },
  tab: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  activeTab: { background: '#4caf50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' },
  brandHeader: { textAlign: 'center', marginBottom: '20px' },
  logo: { width: '120px', borderRadius: '50%', border: '4px solid #5d4037' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr', gap: '20px', maxWidth: '1100px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', margin: '0 auto', maxWidth: '100%', width: '100%' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: '5px solid #5d4037', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' },
  adminSection: { padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', background: '#fafafa' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  label: { fontSize: '0.9rem', fontWeight: 'bold', color: '#5d4037', display: 'block', marginTop: '15px' },
  btnPrimary: { width: '100%', padding: '14px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '10px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #5d4037', color: '#5d4037', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', marginTop: '15px', display: 'block', width: '100%', textAlign: 'center' },
  disciplineList: { maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
