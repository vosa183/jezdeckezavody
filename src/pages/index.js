/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

// BEZPEČNÉ ODESÍLÁNÍ
const sendTelegramMessage = async (text) => {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
  } catch (err) {
    console.error('Chyba při odesílání na náš server:', err);
  }
};

async function generateHash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const disciplineRuleHints = {
  default: [
    "Skóre se hodnotí od -1.5 (Extrémně špatné) do +1.5 (Výborné). Základní skóre je 70.",
    "Mládež do 14 let: možnost jet cvalové pasáže v klusu za snížený počet bodů."
  ],
  ranch: [
    "Penalta 1: Za otěží, rozpadlý rámec, přílišná pomalost, přerušení chodu do 2 kroků.",
    "Penalta 3: Cval na špatnou nohu, tah za otěže, přerušení ve cvalu, krok/klus > 2 kroky, křižování > 2 kroky, vážné porušení překážky.",
    "Penalta 5: Zjevná neposlušnost (kopání, kousání, vyhazování).",
    "Penalta 10: Nepřirozený vzhled koně (soustavné nepřirozené nesení ocasu).",
    "OP (Off Pattern): Vynechání/nedokončení manévru, použití druhé ruky při jednoručním vedení.",
    "DQ: Kulhavost, nepovolená úprava koně, úmyslné týrání, drilování."
  ],
  trail: [
    "Penalta 1/2: Lehký dotek překážky (tiknutí).",
    "Penalta 1: Úder do překážky, krok mimo překážku (1 nohou), rozdělení nohou u kavalety.",
    "Penalta 3: Špatný chod do 2 kroků, pád překážky, krok mimo 2 a více nohama.",
    "Penalta 5: Odmítnutí překážky, vyhnutí se, puštění branky, sesednutí, hrubá neposlušnost.",
    "DQ: Pád koně nebo jezdce, třetí odmítnutí."
  ],
  reining: [
    "Penalta 1/2: Zpožděná změna o 1 skok, nedotočení/přetočení spinu o 1/8.",
    "Penalta 1: Změna cvalu zpožděná o více než 1 skok, 1/4 kruhu na špatnou nohu, přetočení spinu až o 1/4.",
    "Penalta 2: Zmrznutí ve spinu/rollbacku, klus/krok přes marker místo cvalu.",
    "Penalta 5: Spur stop (použití ostruhy před sedlem), držení se sedla, zjevná neposlušnost."
  ],
  showmanship: [
    "POZOR: Hodnotí se ve stupnici od -3 do +3 po celých bodech! Základ je 70 b.",
    "Penalizace: Malá = 3 b., Velká = 5 b., Závažná = 10 b.",
    "F&E (Celkový výkon a efektivita): Hodnocení 0 (průměr) až 5 (excelentní)."
  ]
};

const getRulesForDiscipline = (disciplineName) => {
  const nameL = disciplineName.toLowerCase();
  if (nameL.includes('ranch') || nameL.includes('riding')) return disciplineRuleHints.ranch;
  if (nameL.includes('trail')) return disciplineRuleHints.trail;
  if (nameL.includes('reining')) return disciplineRuleHints.reining;
  if (nameL.includes('showmanship') || nameL.includes('horsemanship') || nameL.includes('equitation')) return disciplineRuleHints.showmanship;
  return disciplineRuleHints.default;
};

export default function Home() {
  const [currentTab, setCurrentTab] = useState('app'); 
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  const [globalPropositions, setGlobalPropositions] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseYear, setNewHorseYear] = useState(''); 
  const [newHorseId, setNewHorseId] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  const [riderBirthDate, setRiderBirthDate] = useState('');
  
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [patternFile, setPatternFile] = useState(null);

  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editDiscOrder, setEditDiscOrder] = useState('');
  const [editDiscManeuvers, setEditDiscManeuvers] = useState('');
  const [editPatternFile, setEditPatternFile] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [newDiscOrder, setNewDiscOrder] = useState(0);

  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');

  // Zápis Admina na místě (Host)
  const [spotRiderName, setSpotRiderName] = useState('');
  const [spotAgeGroup, setSpotAgeGroup] = useState('18+');
  const [spotHorseName, setSpotHorseName] = useState('');
  const [spotDiscipline, setSpotDiscipline] = useState('');

  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));
  const [realJudgeName, setRealJudgeName] = useState('');
  const [isDQ, setIsDQ] = useState(false);

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  useEffect(() => {
    fetchPublicData();
    checkUser();
  }, []);

  const fetchPublicData = async () => {
    // Řazení přesunuto do JS, aby aplikace nespadla, pokud ti v databázi stále chybí sloupec sort_order
    const { data: prices } = await supabase.from('pricing').select('*');
    if (prices) {
      const sortedPrices = prices.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
      setPricing(sortedPrices);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) setEvents(evts);

      if (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'judge' || profile?.role === 'speaker') {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*');
        if (scores) setScoresheets(scores);
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [profile]);

  const logSystemAction = async (actionDesc, detailData = {}) => {
    if (!user) return;
    await supabase.from('system_logs').insert([{
      user_id: user.id,
      action: actionDesc,
      details: detailData
    }]);
  };

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', user.id);
        setMyHorses(horses || []);

        const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        setEvents(evts || []);

        fetchPublicData(); // Reload ceníku

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);

          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        } else {
          const { data: regs } = await supabase.from('race_participants').select('*').eq('user_id', user.id);
          setAllRegistrations(regs || []);

          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        }

        if (prof?.role === 'superadmin') {
          const { data: logs } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
          setSystemLogs(logs || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await logSystemAction('Odhlášení uživatele');
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
        await supabase.from('profiles').insert([{ id: data.user.id, email: email }]);
        alert('Registrace úspěšná! Můžete vstoupit.');
        window.location.reload();
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        await supabase.from('system_logs').insert([{ user_id: data.user.id, action: 'Přihlášení', details: { email } }]);
        window.location.reload();
      }
    }
    setLoading(false);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      email: profile.email || user.email,
      phone: profile.phone,
      stable: profile.stable,
      city: profile.city
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { 
      await logSystemAction('Úprava profilu', { name: profile.full_name });
      alert('Profil uložen!'); 
      setEditMode(false); 
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%";
    let generatedPassword = "";
    for (let i = 0; i < 12; i++) generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    
    try {
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAccountEmail, password: generatedPassword, role: newAccountRole })
      });
      const data = await response.json();
      if (data.success) {
        await logSystemAction('Založen účet', { email: newAccountEmail, role: newAccountRole });
        alert('Účet byl vytvořen a heslo odesláno na e-mail!');
        setNewAccountEmail('');
      } else alert('Chyba: ' + data.error);
    } catch (err) { alert('Chyba komunikace se serverem.'); }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode('');
    }, 500); 
  };

  const handleUpdateSpeakerMessage = async (eventId, currentMessage) => {
    const msg = prompt("Zadejte rychlý vzkaz POUZE pro hlasatele:", currentMessage || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ speaker_message: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else checkUser(); 
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ 
      name: newEventName, event_date: newEventDate, start_num_from: parseInt(newStartNumFrom), start_num_to: parseInt(newStartNumTo)
    }]);
    
    if (error) alert(error.message);
    else { 
      await logSystemAction('Vypsán závod', { name: newEventName });
      const tgMsg = `🎉 <b>NOVÉ ZÁVODY VYPSÁNY!</b>\n\n🏆 <b>Název:</b> ${newEventName}\n📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\nPřihlášky otevřeny!`;
      await sendTelegramMessage(tgMsg);
      alert('Závod vytvořen!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Otevřít přihlášky?' : 'Uzamknout přihlášky a odeslat startku?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (!error) window.location.reload();
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    let patternUrl = null;
    
    if (patternFile) {
      const fileExt = patternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
        patternUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('pricing').insert([{ 
        discipline_name: newDiscName, price: parseInt(newDiscPrice), 
        sort_order: parseInt(newDiscOrder), pattern_url: patternUrl 
    }]);
    if (error) alert(error.message); else window.location.reload(); 
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditDiscOrder(p.sort_order || 0);
    setEditDiscManeuvers(p.maneuver_names || '');
    setEditPatternFile(null);
  };

  const handleSaveEditPricing = async (id) => {
    let patternUrl = null;
    if (editPatternFile) {
      const fileExt = editPatternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, editPatternFile);
      if(!uploadError){
        const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
        patternUrl = urlData.publicUrl;
      }
    }

    const updateData = { price: parseInt(editDiscPrice), sort_order: parseInt(editDiscOrder), maneuver_names: editDiscManeuvers };
    if (patternUrl) updateData.pattern_url = patternUrl;

    const { error } = await supabase.from('pricing').update(updateData).eq('id', id);
    if (!error) { setEditingPricingId(null); fetchPublicData(); }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu smazat ${discName}?`)) {
      await supabase.from('pricing').delete().eq('id', id);
      window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    alert('Poznámka k platbě uložena!');
  };

  // Uložení plánu přes textové pole na tlačítko (Umožňuje enterování pod sebou)
  const handleUpdateSchedule = async (eventId, newSchedule) => {
    const { error } = await supabase.from('events').update({ schedule: newSchedule }).eq('id', eventId);
    if (error) alert(error.message);
    else {
      await logSystemAction('Změna plánu závodů', { schedule: newSchedule });
      if (newSchedule.trim() !== '') await sendTelegramMessage(`📅 <b>AKTUÁLNÍ PLÁN ZÁVODŮ:</b>\n\n${newSchedule}`);
      alert('Plán byl uložen a odeslán na komunikační kanál!');
      checkUser();
    }
  };

  const sendManualTgMessage = async () => {
    if(!manualTgMessage) return;
    await sendTelegramMessage(`📢 <b>INFORMACE OD POŘADATELE:</b>\n\n${manualTgMessage}`);
    alert('Odesláno na Telegram!');
    setManualTgMessage('');
  };

  const handleEndCompetitionAndSendResults = async (eventId) => {
    if(!confirm("Opravdu chcete ukončit závody a odeslat výsledky?")) return;

    const eventObj = events.find(e => e.id === eventId);
    let tgMsg = `🏆 <b>ZÁVODY UKONČENY - VÝSLEDKY</b> 🏆\n\n<b>${eventObj.name}</b>\n\n`;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];

    disciplines.forEach(disc => {
      const ridersInDisc = allRegistrations.filter(r => r.event_id === eventId && r.discipline === disc);
      const scoredRiders = ridersInDisc
        .map(r => {
          const sObj = scoresheets.find(s => s.participant_id === r.id);
          return { ...r, sObj };
        })
        .filter(r => r.sObj && !r.sObj.is_dq && r.sObj.total_score !== -999)
        .sort((a, b) => b.sObj.total_score - a.sObj.total_score); 

      if(scoredRiders.length > 0) {
        tgMsg += `📍 <b>${disc}</b>\n`;
        scoredRiders.forEach((r, index) => {
          let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
          tgMsg += `${medal} ${index + 1}. ${r.rider_name} (${r.horse_name}) - <b>${r.sObj.total_score} b.</b>\n`;
        });
        tgMsg += `\n`;
      }
    });

    tgMsg += `Děkujeme a těšíme se příště! 🎉`;
    await sendTelegramMessage(tgMsg);
    alert('Závody byly ukončeny a listina odeslána!');
  };

  // VÝPOČET VĚKU A KATEGORIE
  const handleDateChangeAndCalcAge = (dateString) => {
    setRiderBirthDate(dateString);
    if(dateString) {
      const dob = new Date(dateString);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
      }
      
      if(age <= 12) setRiderAgeCategory('Děti');
      else if(age <= 14) setRiderAgeCategory('Začátečník (Rookies)');
      else if(age <= 18) setRiderAgeCategory('Pokročilí (Advanced)');
      else setRiderAgeCategory('18+');
    }
  };

  // --- ONLINE REGISTRACE JEZDCE ---
  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city) {
      alert("Než se přihlásíte, musíte mít v levém panelu kompletně vyplněný profil!"); return;
    }
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) {
      alert("Vyplňte jméno, datum narození, vyberte závod, koně a disciplínu."); return;
    }

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) return alert("Napište jméno nového koně!");
      
      // Pro zamezení pádu (kdyby sloupce birth_year a license_number nebyly v DB updatnuté), 
      // pošleme koně napřed jednoduše. Pokud máš ty sloupce u koní, odkomentuj to:
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName.trim() }]) // Pokud mas sloupce, dej misto tohohle: .insert([{ owner_id: user.id, name: newHorseName.trim(), birth_year: parseInt(newHorseYear), license_number: newHorseId }])
        .select().single();
        
      if (horseErr) return alert("Chyba při ukládání koně: " + horseErr.message);
      finalHorseName = newHorse.name;
    }

    const { data: freshRegs } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const capacity = 200;
    const takenNumbers = freshRegs?.map(t => t.start_number) || [];
    const available = Array.from({ length: capacity }, (_, i) => i + 1).filter(n => !takenNumbers.includes(n));
    const assignedNumber = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : 999;

    const registrationData = selectedDisciplines.map(d => {
      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: customRiderName.trim(),
        age_category: riderAgeCategory,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: Math.floor(Math.random() * 50) + 1,
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    });

    // Zde ukládáme přihlášku. Upozorneni: Pokud jsi dosud v profilu neřešil rider_birth_date přes DB, 
    // my ho tam kvůli stabilitě při ukládání netlačíme, ale počítáme z něj ten riderAgeCategory! 
    // Pokud máš extra sloupec v race_participants pro datum, přidal bys ho nad tento komentář.

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      await logSystemAction('Odeslána přihláška', { horse: finalHorseName, rider: customRiderName });
      alert(`Přihláška odeslána!`);
      window.location.reload();
    }
  };

  // --- REGISTRACE NA MÍSTĚ ADMINEM ---
  const handleSpotRegistration = async (e) => {
    e.preventDefault();
    if(!spotRiderName || !spotHorseName || !spotDiscipline) return alert('Chybí data k registraci!');
    
    const assignedNumber = Math.floor(Math.random() * 200) + 1;
    const discData = pricing.find(p => p.discipline_name === spotDiscipline);

    const { error } = await supabase.from('race_participants').insert([{
      user_id: user.id,
      event_id: adminSelectedEvent,
      rider_name: spotRiderName,
      age_category: spotAgeGroup,
      horse_name: spotHorseName,
      discipline: spotDiscipline,
      start_number: assignedNumber,
      draw_order: Math.floor(Math.random() * 50) + 1,
      price: discData ? discData.price : 0,
      is_paid: false,
      payment_note: 'Reg. na místě'
    }]);

    if(error) alert(error.message);
    else {
      alert('Jezdec zapsán do startovky!');
      setSpotRiderName(''); setSpotHorseName('');
      checkUser();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit tuto přihlášku? Startovní číslo se uvolní.")) {
      const { error } = await supabase.from('race_participants').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        alert('Přihláška byla zrušena.');
        window.location.reload();
      }
    }
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLÍNA UZAVŘENA</b>\n\nPrávě bylo dokončeno hodnocení disciplíny <b>${discName}</b>. Děkujeme jezdcům!`);
        alert('Odesláno!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(0));
      setRealJudgeName(existingScore.actual_judge_name || '');
      setIsDQ(existingScore.is_dq || false);
    } else {
      setManeuverScores(Array(10).fill(0));
      setPenaltyScores(Array(10).fill(0));
      setRealJudgeName('');
      setIsDQ(false);
    }
  };

  const handeScoreChange = (index, val) => {
      const newS = [...maneuverScores];
      newS[index] = val;
      setManeuverScores(newS);
  };

  const calculateTotalScore = () => {
    if(isDQ) return -999;
    const baseScore = 70;
    const m = maneuverScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const p = penaltyScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    return baseScore + m - p;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    const timestamp = new Date().toISOString();
    
    // Zapisovatel (ten kdo ma profil) vs. Rozhodčí fyzický realJudgeName
    const scribeName = profile?.full_name || 'Neznámý zapisovatel';

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id, // Scribe id
      judge_name: scribeName, 
      actual_judge_name: realJudgeName, // Tady ten z obdelniku
      scored_at: timestamp,
      signature_hash: 'signed',
      score_data: scoreData,
      total_score: total,
      is_dq: isDQ
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      alert('Hodnocení uloženo!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const rawDisciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];
    const disciplines = rawDisciplines.sort((a,b) => {
        const orderA = pricing.find(p => p.discipline_name === a)?.sort_order || 999;
        const orderB = pricing.find(p => p.discipline_name === b)?.sort_order || 999;
        return orderA - orderB;
    });

    return (
      <div className="print-area">
        {disciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou jezdci.</p>
        ) : (
          disciplines.map(discipline => {
            const discConf = pricing.find(p => p.discipline_name === discipline);
            const manStr = discConf?.maneuver_names || '';
            const manArr = manStr.split(',');
            const printManeuvers = Array.from({length: 10}, (_, i) => manArr[i] ? manArr[i].trim() : `${i+1}`);

            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => a.draw_order - b.draw_order);
            if(ridersInDiscipline.length === 0) return null;

            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            
            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.5rem' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: '#444' }}>SCORESHEET: {discipline}</h3>
                </div>
                
                <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center' }}>DRAW</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center' }}>EXH#</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'left', minWidth: '150px' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '4px', width: '40px', fontSize: '0.7rem' }}></th>
                      <th colSpan="10" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', background: '#f5f5f5' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '70px', textAlign: 'center' }}>PENALTY<br/>TOTAL</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '80px', textAlign: 'center', fontSize: '1.1rem' }}>FINAL<br/>SCORE</th>
                    </tr>
                    <tr>
                      {printManeuvers.map((m,idx) => (
                        <th key={idx} style={{ border: '2px solid black', padding: '6px', width: '40px', textAlign: 'center', background: '#f5f5f5', fontSize: '0.7rem' }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      let pTotal = 0;
                      if(scoreObj) pTotal = scoreObj.score_data.penalties.reduce((a,b)=>a+(parseFloat(b)||0), 0);

                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{r.draw_order}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', borderRight: '1px solid black' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{r.rider_name}</div>
                              <div style={{ color: '#444', fontStyle: 'italic' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>PEN</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => {
                                const penVal = scoreObj ? parseFloat(scoreObj.score_data.penalties[i]) : 0;
                                return (
                                  <td key={`p-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', color: 'red', fontWeight: 'bold', height: '25px' }}>
                                    {penVal > 0 ? `-${penVal}` : ''}
                                  </td>
                                )
                            })}
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.3rem' }}>
                              {scoreObj ? (scoreObj.is_dq ? 'DQ' : scoreObj.total_score) : ''}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>SCORE</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => {
                                const mVal = scoreObj ? parseFloat(scoreObj.score_data.maneuvers[i]) : 0;
                                return (
                                  <td key={`s-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', height: '25px' }}>
                                    {mVal !== 0 ? (mVal > 0 ? `+${mVal}` : mVal) : ''}
                                  </td>
                                )
                            })}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '3px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555' }}>Rozhodčí / Judge:</p>
                    <h3 style={{ margin: '0 0 5px 0' }}>{signatureObj ? signatureObj.actual_judge_name : '_______________________'}</h3>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>Zapsal úředník do PC: {signatureObj ? signatureObj.judge_name : '___________________'}</p>
                  </div>
                </div>

                <div className="footer-branding" style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', textAlign: 'center', fontSize: '0.85rem', color: '#888', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  made by Vosa systems
                </div>
              </div>
            )
          })
        )}
      </div>
    );
  };

if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))] : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  const lockedEvent = events.find(ev => ev.is_locked);
  const speakerEventId = lockedEvent?.id;
  const speakerDiscipline = lockedEvent?.active_discipline;
  const speakerStartList = speakerEventId && speakerDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerDiscipline).sort((a, b) => a.draw_order - b.draw_order) : [];

  const currentRules = getRulesForDiscipline(judgeDiscipline);

  if (currentTab === 'rules' && user) {
    return (
      <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Zpět do Aplikace</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: '#ffb300', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
        
        <div className="no-print" style={styles.card}>
          <h2 style={{color: '#5d4037', textAlign: 'center', marginTop: 0}}>WESTERNOVÉ HOBBY ZÁVODY POD HUMPRECHTEM</h2>
          <h3 style={{color: '#8d6e63', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '20px', marginBottom: '30px'}}>PROPOZICE</h3>

          <div style={{whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.1rem'}}>
             {publicRulesText ? publicRulesText : "Zápis bude vložen..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; margin: 0; padding: 0; font-size: 11pt; }
          .no-print { display: none !important; }
          .print-area { width: 100% !important; max-width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .page-break { page-break-after: always; position: relative; }
          .wrc-scoresheet th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input, select { border: none !important; appearance: none !important; font-weight: bold; background: transparent !important; }
          .print-input::placeholder { color: transparent !important; }
          .footer-branding { position: fixed !important; bottom: 0 !important; }
        }
      `}</style>

      {user && (
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: currentTab === 'app' ? '#ffb300' : 'transparent', color: currentTab === 'app' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Závodní Portál</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: currentTab === 'rules' ? '#ffb300' : 'transparent', color: currentTab === 'rules' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
      )}

      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="no-print" style={{...styles.superAdminBar, flexWrap: 'wrap'}}>
          <strong>{profile?.role === 'superadmin' ? 'SUPERADMIN:' : 'ADMIN:'}</strong> 
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('superadmin')} style={effectiveRole === 'superadmin' ? styles.activeTab : styles.tab}>Superadmin</button>
          )}
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin Pohled</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Zapisovatel</button>
          )}
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('speaker')} style={effectiveRole === 'speaker' ? styles.activeTab : styles.tab}>Spíkr</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hráč Pohled</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={{display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <div style={{...styles.card, flex: 1, minWidth: '300px'}}>
            <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>{isSignUp ? 'Nová registrace' : 'Přihlášení'}</h2>
            <form onSubmit={handleAuth} style={styles.form}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
              <input type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.btnPrimary}>{isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT'}</button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
              {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
            </button>
          </div>
          
          <div style={{...styles.card, flex: 1, minWidth: '300px', background: '#fafafa'}}>
              <h3 style={{color: '#5d4037', marginTop: 0}}>Vypsané Disciplíny v našem app systému:</h3>
              <ul style={{listStyleType: 'none', paddingLeft: 0}}>
                {pricing.map(p => (
                  <li key={p.id} style={{padding: '5px 0', borderBottom: '1px solid #ccc', fontSize: '0.9rem'}}>
                    {p.discipline_name} 
                    {p.pattern_url && <a href={p.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0288d1', marginLeft: '10px'}}>(Úloha Pdf)</a>}
                  </li>
                ))}
              </ul>
          </div>
        </div>
      ) : (
        <div style={styles.mainGrid}>
          <div className="no-print" style={styles.sideCard}>
            <h3>Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                <input style={styles.inputSmall} type="email" placeholder="Email" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Číslo hospodářství" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} required/>
                <button type="submit" style={styles.btnSave}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>E-mail: {profile?.email || user?.email}</p>
                <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                {( !profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city ) && (
                  <p style={{color: '#e57373', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Profil není kompletní.</p>
                )}
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          <div className="print-area" style={styles.card}>
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div className="no-print" style={{marginBottom: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>
                  <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '5px'}}>
                    <button onClick={() => setAdminSelectedEvent('')} style={!adminSelectedEvent ? styles.activeTab : styles.tab}>Nastavení Závodů</button>
                    {effectiveRole === 'superadmin' && (
                       <button onClick={() => setAdminSelectedEvent('accounts')} style={adminSelectedEvent === 'accounts' ? {...styles.activeTab, background: '#e65100'} : {...styles.tab, background: '#e65100'}}>Přístupy</button>
                    )}
                    <button onClick={() => setAdminSelectedEvent('telegram')} style={adminSelectedEvent === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Telegram</button>
                    {events.map(ev => (
                      <button key={ev.id} onClick={() => setAdminSelectedEvent(ev.id)} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                        Detail: {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!adminSelectedEvent && (
                  <div className="no-print">
                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Termíny závodů</h4>
                      <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Název" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <span>Čísla od:</span>
                          <input type="number" value={newStartNumFrom} onChange={e => setNewStartNumFrom(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                          <span>do:</span>
                          <input type="number" value={newStartNumTo} onChange={e => setNewStartNumTo(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                        </div>
                        <button type="submit" style={styles.btnSave}>Vypsat závod</button>
                      </form>
                      <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#eee', textAlign: 'left'}}>
                            <th style={{padding: '8px'}}>Název</th>
                            <th style={{padding: '8px'}}>Datum</th>
                            <th style={{padding: '8px'}}>Rozsah čísel</th>
                            <th style={{padding: '8px'}}>Stav</th>
                            <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(ev => (
                            <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                              <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                              <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString()}</td>
                              <td style={{padding: '8px'}}>{ev.start_num_from || 1} - {ev.start_num_to || 200}</td>
                              <td style={{padding: '8px', color: ev.is_locked ? '#e65100' : '#2e7d32', fontWeight: 'bold'}}>
                                {ev.is_locked ? 'Uzamčeno' : 'Otevřeno'}
                              </td>
                              <td style={{padding: '8px', textAlign: 'center'}}>
                                <button onClick={() => toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}>
                                  {ev.is_locked ? 'Odemknout' : 'Uzamknout'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Ceník disciplín + Tvorba kolonek Manévrů pro Scoresheet k tisku</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="number" placeholder="Číslo řazení v systému" value={newDiscOrder} onChange={e => setNewDiscOrder(e.target.value)} style={{...styles.inputSmall, width: '130px'}} title="Určuje, v jakém pořadí to půjde na soutěži..." />
                        <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <label style={{fontSize: '0.85rem'}}>Úloha:</label>
                          <input type="file" accept=".pdf,image/*" onChange={e => setPatternFile(e.target.files[0])} style={{...styles.inputSmall, width: 'auto'}} />
                        </div>
                        <button type="submit" style={styles.btnSave}>Přidat</button>
                      </form>

                      <div style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                        <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                          <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                            <tr style={{textAlign: 'left'}}>
                              <th style={{padding: '10px', width: '50px'}}>#Řaz.</th>
                              <th style={{padding: '10px'}}>Disciplína</th>
                              <th style={{padding: '10px', width: '80px'}}>Cena</th>
                              <th style={{padding: '10px', width: '160px'}}>Edit Tisk. Manévrů/PDF</th>
                              <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map(p => (
                              <tr key={p.id} style={{borderBottom: '1px solid #eee', background: editingPricingId === p.id ? '#fff9c4' : 'transparent'}}>
                                {editingPricingId === p.id ? (
                                  <>
                                    <td style={{padding: '10px'}}>
                                        <input type="number" value={editDiscOrder} onChange={e => setEditDiscOrder(e.target.value)} style={{...styles.inputSmall, width: '40px'}} />
                                    </td>
                                    <td style={{padding: '10px'}}>{p.discipline_name}</td>
                                    <td style={{padding: '10px'}}>
                                      <input type="number" value={editDiscPrice} onChange={e => setEditDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '70px'}} /> Kč
                                    </td>
                                    <td style={{padding: '10px'}}>
                                      <input type="text" placeholder="Kruh, Spin, Stop..." value={editDiscManeuvers} onChange={e => setEditDiscManeuvers(e.target.value)} style={{...styles.inputSmall, width: '100%', fontSize: '0.7rem'}} title="Manévry oddělené čárkou" />
                                      <input type="file" accept=".pdf,image/*" onChange={e => setEditPatternFile(e.target.files[0])} style={{width: '130px', fontSize: '0.75rem', marginTop: '4px'}} />
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={() => handleSaveEditPricing(p.id, p.discipline_name)} style={{...styles.btnSave, padding: '5px 10px', display: 'block', width: '100%', marginBottom: '4px'}}>Uložit</button>
                                      <button onClick={() => setEditingPricingId(null)} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{padding: '10px', color: '#888'}}>{p.sort_order}</td>
                                    <td style={{padding: '10px'}}><strong>{p.discipline_name}</strong></td>
                                    <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                                    <td style={{padding: '10px', color: '#555', fontStyle: 'italic', fontSize: '0.7rem'}}>
                                      {p.maneuver_names ? p.maneuver_names.substring(0, 30) + '...' : 'Manévr 1..10'}
                                      <br/>
                                      {p.pattern_url && <a href={p.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0277bd', fontWeight: 'bold', display: 'inline-block', marginTop: '4px'}}>Zobrazit PDF</a>}
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={() => startEditingPricing(p)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>Edit</button>
                                      <button onClick={() => handleDeletePricing(p.id, p.discipline_name)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Smazat</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminSelectedEvent === 'accounts' && effectiveRole === 'superadmin' && (
                  <div className="no-print">
                    <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #e65100', margin: '20px 0'}}>
                      <h3 style={{color: '#e65100', marginTop: 0}}>Nové uživatelské přístupy</h3>
                      <form onSubmit={handleCreateAccount} style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                        <input type="email" placeholder="E-mailová adresa" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)} style={styles.inputSmall} required/>
                        <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={styles.inputSmall}>
                          <option value="judge">Zapisovatel / Rozhodčí</option>
                          <option value="speaker">Hlasatel (Speaker)</option>
                          <option value="admin">Administrátor</option>
                        </select>
                        <button type="submit" style={{...styles.btnSave, background: '#e65100'}}>Vygenerovat heslo a odeslat</button>
                      </form>
                    </div>
                  </div>
                )}

                {adminSelectedEvent === 'telegram' && (
                  <div className="no-print">
                    <div style={{background: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1', textAlign: 'center'}}>
                      <h3 style={{color: '#0288d1', marginTop: 0}}>📢 Manuální odeslání zprávy do kanálu</h3>
                      <input type="text" placeholder="Napište vzkaz pro jezdce..." value={manualTgMessage} onChange={e => setManualTgMessage(e.target.value)} style={{...styles.input, fontSize: '1.1rem', padding: '15px'}} />
                      <button onClick={sendManualTgMessage} style={{...styles.btnSave, background: '#0288d1', padding: '15px 30px', fontSize: '1.1rem', marginTop: '10px'}}>Odeslat Zprávu Nyní</button>
                    </div>
                  </div>
                )}

                {/* Sekce úprav propozic v Adminovi */}
                {adminSelectedEvent && adminSelectedEvent !== 'telegram' && adminSelectedEvent !== 'accounts' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní rychlý vzkaz pro Spíkra a Zapisovatele (neveřejný):</strong>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === adminSelectedEvent)?.speaker_message || 'Žádná zpráva'}</span>
                      </div>
                      <button onClick={() => handleUpdateSpeakerMessage(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '10px'}}>📋 Plán závodů / Harmonogram (Vidí všichni jezdci - klávesa Enter vytvoří nový řádek):</strong>
                      <textarea
                        value={events.find(e => e.id === adminSelectedEvent)?.schedule || ''}
                        onChange={(e) => {
                          const newEvts = events.map(ev => ev.id === adminSelectedEvent ? {...ev, schedule: e.target.value} : ev);
                          setEvents(newEvts);
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit'}}
                      />
                      <button onClick={() => handleUpdateSchedule(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.schedule)} style={{...styles.btnOutline, marginTop: '10px'}}>Pevně uložit psaný plán závodů a vyvolat Hlášku</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#e1f5fe', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1'}}>
                      <h4 style={{marginTop: 0, color: '#0288d1', marginBottom: '10px'}}>Napsat Jezdce ručně na startku (U stolu na Závodišti)</h4>
                      <form onSubmit={handleSpotRegistration} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <input type="text" placeholder="Jméno jezdce na místě" value={spotRiderName} onChange={e=>setSpotRiderName(e.target.value)} required style={styles.inputSmall}/>
                        <select value={spotAgeGroup} onChange={e=>setSpotAgeGroup(e.target.value)} style={styles.inputSmall}>
                          <option value="18+">18+ Open (Otevřená)</option>
                          <option value="Rozhodčí zohlední">Advanced (Mládež Do 18)</option>
                          <option value="Začátečník (Rookies)">Rookies (Mladoši do 14)</option>
                          <option value="Děti">Družina: Děti</option>
                        </select>
                        <input type="text" placeholder="Celé Jméno Koně" value={spotHorseName} onChange={e=>setSpotHorseName(e.target.value)} required style={styles.inputSmall}/>
                        <select value={spotDiscipline} onChange={e=>setSpotDiscipline(e.target.value)} required style={styles.inputSmall}>
                          <option value="">Zvolte prosím padnoucí Disciplínu ze systému</option>
                          {pricing.map(p => <option key={p.id} value={p.discipline_name}>{p.discipline_name}</option>)}
                        </select>
                        <button type="submit" style={{...styles.btnSave, background: '#0288d1'}}>Vystřelit jezdce na Obdélník!</button>
                      </form>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#fff9c4', padding: '20px', borderRadius: '8px', border: '2px solid #fbc02d', textAlign: 'center'}}>
                      <h3 style={{margin: '0 0 10px 0', color: '#f57f17'}}>Konec závodů a Odjezd Domů</h3>
                      <button onClick={() => handleEndCompetitionAndSendResults(adminSelectedEvent)} style={{...styles.btnSave, background: '#fbc02d', color: '#000', fontSize: '1.2rem', padding: '15px 30px'}}>🏆 Definitivně Utnout a Vyhlásit Vítěze na Telegram Síťi</button>
                    </div>

                    <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 className="no-print" style={{margin: 0}}>Kompletní startovní listina Dneška a Výběr Startovného u Okenka</h4>
                        <h2 style={{display: 'none', margin: '0 0 20px 0', textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px'}} className="print-only">Startovní listina: {events.find(e => e.id === adminSelectedEvent)?.name}</h2>
                        <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                      </div>
                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#eee', textAlign: 'left'}}>
                              <th style={{padding: '8px', width: '60px'}}>Záda</th>
                              <th style={{padding: '8px', width: '60px'}}>Draw</th>
                              <th style={{padding: '8px'}}>Kategorie</th>
                              <th style={{padding: '8px'}}>Jezdec</th>
                              <th style={{padding: '8px'}}>Kůň</th>
                              <th style={{padding: '8px'}}>Disciplína</th>
                              <th className="no-print" style={{padding: '8px'}}>Poznámka k platbě od Výběrčíka</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRegistrations.filter(r => r.event_id === adminSelectedEvent).sort((a,b) => a.draw_order - b.draw_order).map((r, i) => (
                              <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                <td style={{padding: '8px'}}><strong>{r.draw_order || '-'}</strong></td>
                                <td style={{padding: '8px', fontSize: '0.8rem', color: '#666'}}>{r.age_category}</td>
                                <td style={{padding: '8px', fontWeight: 'bold'}}>{r.rider_name}</td>
                                <td style={{padding: '8px'}}>{r.horse_name}</td>
                                <td style={{padding: '8px'}}>{r.discipline}</td>
                                <td className="no-print" style={{padding: '8px'}}>
                                  <input 
                                    type="text" 
                                    defaultValue={r.payment_note || ''} 
                                    onBlur={(e) => updatePaymentNote(r.id, e.target.value)} 
                                    placeholder="např. Zaplaceno..."
                                    style={{padding: '5px', width: '130px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={{...styles.adminSection, border: printMode ? 'none' : '1px solid #ddd'}}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Generátor PDF Scoresheetů prop Rozhodčí z papíru (Do Desek)</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ TISK VŠECH OFICIÁLNÍCH SCORESHEETŮ PRO DISCIPLINU</button>
                      </div>
                      
                      {renderPrintableScoresheets(adminSelectedEvent)}

                    </div>
                  </div>
                )}

                {effectiveRole === 'superadmin' && !adminSelectedEvent && (
                  <div className="no-print" style={{...styles.adminSection, border: '2px solid #000', background: '#e0e0e0', marginTop: '20px'}}>
                    <h4 style={{margin: '0 0 10px 0'}}>Logy celého systému a audit transakcí</h4>
                    <div style={{maxHeight: '300px', overflowY: 'auto', background: '#fff', padding: '10px'}}>
                      {systemLogs.length === 0 ? <p>Žádné audit logy nedotekly.</p> : (
                        <ul style={{listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem'}}>
                          {systemLogs.map(log => (
                            <li key={log.id} style={{borderBottom: '1px solid #eee', padding: '8px 0'}}>
                              <span style={{color: '#888'}}>{new Date(log.created_at).toLocaleString('cs-CZ')}</span> - 
                              <strong style={{marginLeft: '10px'}}>{log.action}</strong>
                              <div style={{color: '#555', marginTop: '4px', fontSize: '0.8rem'}}>{JSON.stringify(log.details)}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POHLED ZAPISOVATELE (Bývalý Judge Role) */}
            {effectiveRole === 'judge' && (
              <div className={printMode ? 'print-area' : ''}>
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd'}}>Zapisovatelské stanoviště a zadávání finálních známek</h3>
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div>
                      <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz a telefon pro věž (Spíkr):</strong>
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === judgeEvent)?.speaker_message || 'Žádná linka'}</span>
                    </div>
                    <button onClick={() => handleUpdateSpeakerMessage(judgeEvent, events.find(e => e.id === judgeEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Odešli zprávu na Věž</button>
                  </div>
                )}
                
                <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                  {evaluatingParticipant ? (
                    <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      
                      <div style={{flex: 2, minWidth: '300px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <h2 style={{marginTop: 0}}>{evaluatingParticipant.discipline}</h2>
                          <h2 style={{marginTop: 0}}>Startovní číslo EXH: {evaluatingParticipant.start_number}</h2>
                        </div>
                        <p style={{fontSize: '1.2rem', marginBottom: '30px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>
                        
                        <div style={{marginBottom: '20px'}}>
                          <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Reálný Úřední Rozhodčí pro pískoviště (z tiskového archu):</label>
                          <input type="text" placeholder="Např. Ing. Petr Novák" value={realJudgeName} onChange={e => setRealJudgeName(e.target.value)} style={{...styles.input, marginTop: 0, border: '2px solid #000'}} />
                        </div>

                        <div style={{marginBottom: '20px', background: '#ffebee', padding: '15px', borderRadius: '8px', border: '1px solid #c62828', display: 'flex', gap: '15px', alignItems: 'center'}}>
                          <input type="checkbox" id="dqControlBox" checked={isDQ} onChange={e => setIsDQ(e.target.checked)} style={{transform: 'scale(1.5)'}}/>
                          <label htmlFor="dqControlBox" style={{color: '#b71c1c', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer'}}>JEZDEC OBDRŽEL PLATNOU DISKVALIFIKACI (DQ)</label>
                        </div>

                        {!isDQ && (
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            <div>
                              <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry z tužky</h4>
                              {maneuverScores.map((score, index) => {
                                const theDisc = evaluatingParticipant.discipline.toLowerCase();
                                const isShowHaltClass = theDisc.includes('showmanship') || theDisc.includes('horsemanship') || theDisc.includes('equitation');
                                const discProp = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline);
                                const customManArr = discProp?.maneuver_names ? discProp.maneuver_names.split(',') : [];
                                const manLabelText = customManArr[index] ? customManArr[index].trim() : `Box ${index + 1}`;

                                return (
                                  <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                    <strong>{manLabelText}</strong>
                                    <select value={score} onChange={(e) => handeScoreChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', width: '130px', fontSize: '1rem', fontWeight: 'bold'}}>
                                      {isShowHaltClass ? (
                                        <>
                                          <option value="3">+3 (Excelentní)</option>
                                          <option value="2">+2 (Velmi dobré)</option>
                                          <option value="1">+1 (Dobré)</option>
                                          <option value="0">0 (Průměr)</option>
                                          <option value="-1">-1 (Lehce slabé)</option>
                                          <option value="-2">-2 (Velmi slabé)</option>
                                          <option value="-3">-3 (Ext. Špatné)</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="1.5">+1.5 (Excellent)</option>
                                          <option value="1.0">+1.0 (Very Good)</option>
                                          <option value="0.5">+0.5 (Good)</option>
                                          <option value="0">0 (Average)</option>
                                          <option value="-0.5">-0.5 (Poor)</option>
                                          <option value="-1.0">-1.0 (Very Poor)</option>
                                          <option value="-1.5">-1.5 (Extremely Poor)</option>
                                        </>
                                      )}
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                            <div>
                              <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Mínus (Penalty Trest)</h4>
                              {penaltyScores.map((penalty, index) => (
                                <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                  <strong>Mínus pro úsek č. {index + 1}</strong>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    step="0.5" 
                                    value={penalty || ''} 
                                    onChange={(e) => { const n = [...penaltyScores]; n[index] = e.target.value || 0; setPenaltyScores(n); }} 
                                    style={{padding: '5px', width: '60px', borderRadius: '4px', border: '1px solid #f44336', textAlign: 'center', fontSize: '1rem'}}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{marginTop: '30px', padding: '15px', background: '#e1f5fe', borderRadius: '8px', textAlign: 'right', border: '2px solid black'}}>
                          <span style={{fontSize: '1.2rem', color: '#000'}}>Základ: 70 | </span>
                          <strong style={{fontSize: '1.5rem', color: '#000'}}>VÁŠ VYPRACOVANÝ SOUČET: {calculateTotalScore() === -999 ? 'JEZDEC MÁ DQ' : calculateTotalScore()}</strong>
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                          <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Potvrdit a propsat na Věž a Web</button>
                          <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 0.5, marginTop: 0}}>Odejít z úprav bez ukládání</button>
                        </div>
                      </div>

                      <div className="no-print" style={{flex: 1, minWidth: '250px', background: '#fff9c4', padding: '15px', borderRadius: '8px', border: '1px solid #fbc02d'}}>
                        <h4 style={{marginTop: 0, color: '#f57f17', borderBottom: '1px solid #fbc02d', paddingBottom: '5px'}}>Záchytný Prsten Pravidel WRC</h4>
                        <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: '#333'}}>
                          {getRulesForDiscipline(evaluatingParticipant.discipline).map((rule, idx) => (
                            <li key={idx} style={{marginBottom: '8px'}}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={styles.label}>1. Uzamčené pískoviště závodiště:</label>
                      <select style={{...styles.input, fontSize: '1.1rem'}} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                        <option value="">-- Otevřít listinu ročníku --</option>
                        {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>

                      {judgeEvent && (
                        <div>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                            <div style={{flex: 1}}>
                              <label style={styles.label}>2. Zapípni Tuto Vteřinu se jedoucí Disciplínu (Až to potvrdíš ukážeš věži obrazovku):</label>
                              <select style={{...styles.input, fontSize: '1.1rem', background: '#e1f5fe'}} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                                <option value="">-- Startovka zatím skrývá oponu --</option>
                                {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {judgeEvent && judgeDiscipline && (
                        <div style={{marginTop: '20px'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 style={{margin: 0}}>Lidi na trati Pískoviště: {judgeDiscipline}</h4>
                            <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0, padding: '5px 10px'}}>📣 Zapískat: Na Telegram jako Konečnou čáru disciplínky</button>
                          </div>
                          <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                              <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                                <th style={{padding: '10px'}}>Draw Pořadí</th>
                                <th style={{padding: '10px'}}>Číslo Koně</th>
                                <th style={{padding: '10px'}}>Čoček nahoře + Kůň</th>
                                <th style={{padding: '10px', textAlign: 'center'}}>Aplikace</th>
                              </tr>
                            </thead>
                            <tbody>
                              {judgeStartList.length > 0 ? judgeStartList.map(r => {
                                const isScored = scoresheets.some(s => s.participant_id === r.id);
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee', background: isScored ? '#e8f5e9' : 'transparent'}}>
                                    <td style={{padding: '10px', fontWeight: 'bold', color: '#0277bd', fontSize: '1.1rem'}}>{r.draw_order}. ve frontě</td>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{r.start_number}</td>
                                    <td style={{padding: '10px'}}>{r.rider_name} <br/><span style={{fontSize: '0.8rem', color: '#666'}}>{r.horse_name}</span></td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      {isScored ? (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '5px 10px', border: '1px solid #4caf50', color: '#4caf50', fontWeight: 'bold'}}>
                                          {scoreObj.is_dq ? 'Oprava chyby archu (DQ)' : `Oprava chyby archu (${scoreObj.total_score})`}
                                        </button>
                                      ) : (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd'}}>Zapsat papír od stolu</button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }) : (
                                <tr><td colSpan="5" style={{padding: '15px', textAlign: 'center'}}>Žádní jezdci v bubnu této dráhy.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className={printMode === 'scoresheets' ? 'print-area' : 'no-print'} style={{...styles.adminSection, marginTop: '30px', border: printMode ? 'none' : '1px solid #ddd'}}>
                    <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <h4 style={{margin: 0}}>Velké Scoresheety k Tiskařským odškrtávačům prop Rozhodčí z PC</h4>
                      <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ PDF Archy - Otevřít a Poslat do Tiskárny</button>
                    </div>
                    {renderPrintableScoresheets(judgeEvent)}
                  </div>
                )}
              </div>
            )}

            {/* POHLED HLASATELE / SPEAKER */}
            {effectiveRole === 'speaker' && (
              <div className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#5d4037'}}>Oko z Věže (Hlasatel)</h3>
                </div>
                
                {speakerEventId ? (
                  <div>
                    <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', whiteSpace: 'pre-wrap'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán organizace (Textová nástěnka pro všechny lidi co je uvidí):</strong>
                      <span style={{fontSize: '1.2rem'}}>{lockedEvent?.schedule || 'Harmonogram nevidím.'}</span>
                    </div>

                    {lockedEvent?.speaker_message && (
                      <div style={{background: '#ffe0b2', border: '4px solid #e65100', padding: '20px', borderRadius: '12px', marginTop: '10px', marginBottom: '30px', textAlign: 'center'}}>
                        <h3 style={{margin: '0 0 10px 0', color: '#e65100', textTransform: 'uppercase', letterSpacing: '2px'}}>🚨 Věžní Alarm (zpráva ze Stolu od Zapisovatele/Vedenička):</h3>
                        <p style={{fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#e65100'}}>
                          {lockedEvent?.speaker_message}
                        </p>
                      </div>
                    )}

                    {!speakerDiscipline ? (
                      <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '2px dashed #ccc'}}>
                        <h2 style={{color: '#666', borderBottom: 'none'}}>Když Pískoviště nevyplní kolonku: Aktuálně sledovaná disciplína do sítě, Věž nic nevidí... ZKUS jim napsat pres chat nahoře.</h2>
                      </div>
                    ) : (
                      <div style={{marginTop: '30px'}}>
                        <h2 style={{fontSize: '2rem', textAlign: 'center', color: '#5d4037', borderBottom: '3px solid #5d4037', paddingBottom: '15px'}}>ÚSTÍ ARÉNY DO REPRODUKTORŮ: {speakerDiscipline}</h2>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                          <thead>
                            <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                              <th style={{padding: '15px'}}>Pravidlo Draw</th>
                              <th style={{padding: '15px'}}>S/N (Záda)</th>
                              <th style={{padding: '15px'}}>Jede (Jezdec / Kůň)</th>
                              <th style={{padding: '15px', textAlign: 'right'}}>Odfajvknuto z PC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {speakerStartList.length > 0 ? speakerStartList.map(r => {
                              const isScored = scoresheets.some(s => s.participant_id === r.id);
                              const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                              
                              return (
                                <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.5rem', background: isScored ? '#f1f8e9' : '#fff'}}>
                                  <td style={{padding: '15px', fontWeight: 'bold', color: '#5d4037'}}>{r.draw_order}.</td>
                                  <td style={{padding: '15px', fontWeight: '900', fontSize: '1.8rem'}}>{r.start_number}</td>
                                  <td style={{padding: '15px'}}>
                                     {r.rider_name} <span style={{fontSize:'1rem'}}>({r.age_category})</span>
                                     <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{r.horse_name}</div>
                                  </td>
                                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                    {isScored ? (scoreObj.is_dq ? 'DQ (Diskvalifik.)' : `${scoreObj.total_score} bodů z PC`) : 'Živě na Trati / Stojí na Čáře'}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', fontSize: '1.2rem'}}>Žádní jezdci v bubnu nevyplavli.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>Dědečku vypni plyn a zavři branku arény, Zamčený Hlavní strom je prázdný.</p>
                )}
              </div>
            )}

            {/* POHLED JEZDCE A STARTKY (Bývalý Player Pohled) */}
            {effectiveRole === 'player' && (
              <div className="no-print">
                
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Místnost Přihlášek s Kartou Jízd</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Uzel Telegramových Komunikací</button>
                </div>

                {playerTab === 'telegram' && (
                  <div style={{background: '#e3f2fd', padding: '30px 20px', borderRadius: '8px', border: '1px solid #0288d1', textAlign: 'center', margin: '20px 0'}}>
                    <h2 style={{color: '#0288d1', marginTop: 0}}>📱 Věž do ucha a Startovka u ruky!</h2>
                    <p style={{fontSize: '1.1rem', color: '#333', marginBottom: '20px'}}>Nenech si ujít cinknutí do telefonu o dalším dělání v aréně.</p>
                    <a href="https://t.me/+xZ7MOtlAaX05YzA0" target="_blank" rel="noopener noreferrer" style={{...styles.btnSave, background: '#0288d1', textDecoration: 'none', display: 'inline-block', fontSize: '1.2rem', padding: '15px 30px'}}>Potvrdit přidání Telegram Skupiny Jezdců do tel...</a>
                  </div>
                )}

                {playerTab === 'main' && (
                  <div>
                    <h3 style={{marginTop: 0}}>Nový Lístek a Podání okének pro Cihlu dneška do věže</h3>
                    
                    <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #0288d1', marginBottom: '15px'}}>
                      
                      <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '10px'}}>
                         <div style={{flex: 1, minWidth: '200px'}}>
                           <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Jméno reálně sedícího na koni:</label>
                           <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', marginTop: '5px'}} placeholder="Karel Čapek atd..." />
                         </div>
                         <div style={{flex: 1, minWidth: '200px'}}>
                            <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Narození jezdce k ověření dat třídy:</label>
                            <input type="date" value={riderBirthDate} onChange={e => handleDateChangeAndCalcAge(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', marginTop: '5px'}}/>
                         </div>
                      </div>
                      
                      <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Skupina automatická z věku / nebo zadej vlastní zletilost prstem:</label>
                      <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: '5px 0 0 0'}}>
                        <option value="18+">18+ Roků Open (Dospělí)</option>
                        <option value="Pokročilí (Advanced)">Advanced 14-18 let (Mládež)</option>
                        <option value="Začátečník (Rookies)">Rookies do 14 let (Začátečníci)</option>
                        <option value="Děti">Lidice do 12 let (Děti s vodičem atd)</option>
                        <option value="Hříbata">Hříbata zvířat do 3 let z ohrady</option>
                      </select>
                    </div>

                    <label style={styles.label}>Na co se dnes přišpendlíte (Termíny):</label>
                    <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                      <option value="">-- Živá otevřená pole --</option>
                      {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString('cs-CZ')})</option>)}
                    </select>

                    <label style={styles.label}>Čtyřkolka do bitvy (Kůň z bedny):</label>
                    <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                      <option value="">-- Má zaparkovaná zvířata --</option>
                      {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="new">+ Uložit Zbrusu nového zvířete Koně na věky do pískoviště do stáje</option>
                    </select>

                    {selectedHorse === 'new' && (
                      <div style={{background: '#fff9c4', padding: '15px', borderRadius: '8px', border: '1px dashed #e65100', marginTop: '10px'}}>
                          <span style={{fontSize: '0.85rem', color: '#e65100', fontWeight: 'bold'}}>Evidentně nový obyvatel pískoviště, vytvořme ho.</span>
                          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px'}}>
                              <input type="text" placeholder="Ofiko jméno ze složky" value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, flex: 2, minWidth: '150px'}} />
                              <input type="number" placeholder="Byl narozen (rok 2012 atp)" value={newHorseYear} onChange={e => setNewHorseYear(e.target.value)} style={{...styles.input, flex: 1, minWidth: '130px'}} />
                              <input type="text" placeholder="Čísla z knížky Průkazu" value={newHorseId} onChange={e => setNewHorseId(e.target.value)} style={{...styles.input, flex: 1, minWidth: '130px'}} />
                          </div>
                      </div>
                    )}

                    <label style={styles.label}>Disciplíny vyházené organizátorem z pytle:</label>
                    {pricing.length === 0 ? <p style={{color: 'red'}}>Vypadá to že Admin spinká a nic na ceník nedal.</p> : (
                      <div style={styles.disciplineList}>
                        {pricing.map(d => (
                          <div key={d.id} style={{display: 'flex', flexDirection: 'column', borderBottom: '1px solid #ccc', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff', border: selectedDisciplines.find(x => x.id === d.id) ? '2px solid #5d4037' : '1px solid #ddd', borderRadius: '4px', marginBottom: '6px', overflow: 'hidden'}}>
                            <div onClick={() => {
                              const exists = selectedDisciplines.find(x => x.id === d.id);
                              setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                            }} style={{...styles.disciplineItem, borderBottom: 'none'}}>
                              <span style={{fontWeight: selectedDisciplines.find(x => x.id === d.id) ? 'bold' : 'normal'}}>{d.discipline_name}</span>
                              <strong style={{color: '#5d4037'}}>{d.price} Kč</strong>
                            </div>
                            {d.pattern_url && (
                              <div style={{padding: '0 12px 12px 12px', background: '#f5f5f5'}}>
                                <a href={d.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0288d1', fontSize: '0.85rem', fontWeight: 'bold'}}>📄 Otevři v klidu pro studium doma PDF papírek Rozepsané Úlohy z věže</a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={styles.priceTag}>
                      Hotovost vkládaná za chvilku do Okna Kanceláře: <span style={{fontSize: '1.4rem'}}>{selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč</span>
                    </div>

                    <button onClick={handleRaceRegistration} style={styles.btnSecondary}>
                      Odeslouknout Listek do Věže Okamžitě do Databáze
                    </button>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Má přišpendlená Startovní místa u okénka</h3>
                        
                        {events.filter(e => allRegistrations.filter(r => r.user_id === user?.id).some(r => r.event_id === e.id) && e.schedule).map(ev => (
                          <div key={ev.id} style={{background: '#f5f5f5', padding: '10px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #8d6e63', whiteSpace: 'pre-wrap'}}>
                            <strong style={{color: '#5d4037'}}>Dráty do Pískoviště ze Věže (Plán zvednutí ruky z věže pro tyhle závody {ev.name}):</strong><br/>
                            {ev.schedule}
                          </div>
                        ))}

                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                            <thead>
                              <tr style={{background: '#eee', textAlign: 'left'}}>
                                <th style={{padding: '8px'}}>Očekávaná Válka disciplíny</th>
                                <th style={{padding: '8px'}}>Vybavené Číslo z Věže (EXH)</th>
                                <th style={{padding: '8px'}}>Pro Jízdárnového Lidičku s jeho Koníčekm</th>
                                <th style={{padding: '8px'}}>Tabulové Bodování Písku (Známka Domů)</th>
                                <th style={{padding: '8px', textAlign: 'center'}}>Stres z drátů? Odejít</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                                const eventObj = events.find(e => e.id === r.event_id);
                                const isEventLocked = eventObj?.is_locked || false;
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px'}}><strong>{r.discipline}</strong></td>
                                    <td style={{padding: '8px', fontSize: '1.3rem', fontWeight: 'bold', color: '#5d4037'}}>{r.start_number}</td>
                                    <td style={{padding: '8px'}}>
                                        <div>{r.rider_name} <span style={{fontSize: '0.8rem'}}>({r.age_category})</span></div>
                                        <div style={{color: '#666', fontStyle: 'italic'}}>{r.horse_name}</div>
                                    </td>
                                    <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? (scoreObj.is_dq ? '#d84315' : '#2e7d32') : '#888'}}>
                                      {scoreObj ? (scoreObj.is_dq ? 'Vyloučeno DQ.' : scoreObj.total_score) : 'Nevyděláno od Stojanu.'}
                                    </td>
                                    <td style={{padding: '8px', textAlign: 'center'}}>
                                      {!isEventLocked ? (
                                        <button onClick={() => handleCancelRegistration(r.id)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Umazat Start</button>
                                      ) : (
                                        <span style={{color: '#888', fontSize: '0.8rem'}}>Šlus Uzamčeno</span>
                                      )}
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
                )}
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
  superAdminBar: { background: '#000', color: '#fff', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px', marginBottom: '20px' },
  tab: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  activeTab: { background: '#4caf50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' },
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
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #5d4037', color: '#0277bd', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' },
  btnSave: { padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', marginTop: '15px', display: 'block', width: '100%', textAlign: 'center' },
  disciplineList: { maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px', padding: '5px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
