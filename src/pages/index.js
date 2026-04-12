/* eslint-disable */
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

// BEZPEČNÉ ODESÍLÁNÍ (TOKENY JSOU SCHOVANÉ NA SERVERU)
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
    "POZOR: Tato disciplína (Showmanship/Horsemanship) se hodnotí od -3 (Extrémně špatné) do +3 (Excelentní), POUZE PO CELÝCH BODECH!",
    "Penalizace: Malá = 3 b., Velká = 5 b., Závažná = 10 b.",
    "F&E (Celkový výkon a efektivita): Hodnocení 0 (průměr) až 5 (excelentní)."
  ]
};

const getRulesForDiscipline = (disciplineName) => {
  if (!disciplineName) return disciplineRuleHints.default;
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
  
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseBirthYear, setNewHorseBirthYear] = useState(''); 
  const [newHorseLicense, setNewHorseLicense] = useState(''); 
  
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  
  // NOVÁ POLÍČKA PRO REGISTRACI A PDF
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [patternFile, setPatternFile] = useState(null);

  // STAVY PRO INLINE EDITACI CENÍKU
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editDiscSort, setEditDiscSort] = useState(0);
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
  const [newDiscSort, setNewDiscSort] = useState(0);
  
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');

  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));
  const [actualJudgeName, setActualJudgeName] = useState('');
  const [isDQ, setIsDQ] = useState(false);

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  const [publicRulesText, setPublicRulesText] = useState('');
  const [editRulesText, setEditRulesText] = useState('');

  // Hostovská registrace (Admin na místě)
  const [hostRiderName, setHostRiderName] = useState('');
  const [hostAgeCat, setHostAgeCat] = useState('18+');
  const [hostHorseName, setHostHorseName] = useState('');
  const [hostDiscipline, setHostDiscipline] = useState('');

  useEffect(() => {
    fetchPublicSettings();
    checkUser();
  }, []);

  const fetchPublicSettings = async () => {
    const { data: prices } = await supabase.from('pricing').select('*').order('sort_order', { ascending: true });
    if (prices) setPricing(prices);

    const { data: settings } = await supabase.from('system_settings').select('rules_text').eq('id', 1).single();
    if (settings) {
      setPublicRulesText(settings.rules_text);
      setEditRulesText(settings.rules_text);
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
      birth_date: profile.birth_date,
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

  const handleUpdateRules = async () => {
    const { error } = await supabase.from('system_settings').upsert({ id: 1, rules_text: editRulesText });
    if(error) alert(error.message);
    else {
      alert('Propozice uloženy!');
      fetchPublicSettings();
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%";
    let generatedPassword = "";
    for (let i = 0; i < 12; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAccountEmail, password: generatedPassword, role: newAccountRole })
      });
      const data = await response.json();
      if (data.success) {
        await logSystemAction('Založen nový účet', { email: newAccountEmail, role: newAccountRole });
        alert('Účet byl úspěšně vytvořen a heslo odesláno na e-mail!');
        setNewAccountEmail('');
      } else {
        alert('Chyba: ' + data.error);
      }
    } catch (err) {
      alert('Chyba komunikace se serverem.');
    }
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
      else {
        await logSystemAction('Změna interní zprávy pro Spíkra', { msg });
        checkUser(); 
      }
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ 
      name: newEventName, 
      event_date: newEventDate, 
      start_num_from: parseInt(newStartNumFrom),
      start_num_to: parseInt(newStartNumTo)
    }]);
    
    if (error) {
      alert(error.message);
    } else { 
      await logSystemAction('Vypsán nový závod', { name: newEventName });
      const tgMsg = `🎉 <b>NOVÉ ZÁVODY VYPSÁNY!</b>\n\n🏆 <b>Název:</b> ${newEventName}\n📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\nPřihlášky byly právě otevřeny. Těšíme se na vás! 🤠`;
      await sendTelegramMessage(tgMsg);
      alert('Závod vytvořen a oznámení odesláno do Telegramu!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Opravdu chcete závod znovu otevřít pro přihlášky?' : 'Opravdu chcete uzamknout přihlášky?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction(currentLocked ? 'Odemčen závod' : 'Uzamčen závod', { event: eventName });
        window.location.reload();
      }
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    let patternUrl = null;
    
    if (patternFile) {
      const fileExt = patternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      if (uploadError) return alert('Chyba nahrávání: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('pricing').insert([{ 
      discipline_name: newDiscName, 
      price: parseInt(newDiscPrice), 
      sort_order: parseInt(newDiscSort),
      pattern_url: patternUrl 
    }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Nová disciplína v ceníku', { discipline: newDiscName });
      window.location.reload(); 
    }
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditDiscSort(p.sort_order || 0);
    setEditDiscManeuvers(p.maneuver_names || '');
    setEditPatternFile(null);
  };

  const handleSaveEditPricing = async (id, discName) => {
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

    const updateData = { 
      price: parseInt(editDiscPrice),
      sort_order: parseInt(editDiscSort),
      maneuver_names: editDiscManeuvers
    };
    if (patternUrl) updateData.pattern_url = patternUrl;

    const { error } = await supabase.from('pricing').update(updateData).eq('id', id);
    if (error) alert(error.message);
    else {
      await logSystemAction('Změna disciplíny', { discipline: discName });
      setEditingPricingId(null);
      fetchPublicSettings();
    }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu chcete smazat disciplínu ${discName}?`)) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (!error) window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    alert('Poznámka k platbě uložena!');
  };

  const handleUpdateSchedule = async (eventId, currentSchedule) => {
    const msg = prompt("Zadejte textový plán (možnost enterování pro odřádkování):", currentSchedule || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ schedule: msg }).eq('id', eventId);
      if (!error) {
        if (msg.trim() !== '') await sendTelegramMessage(`📅 <b>AKTUÁLNÍ PLÁN ZÁVODŮ:</b>\n\n${msg}`);
        checkUser();
      }
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
        .filter(r => r.sObj && !r.sObj.is_dq)
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

    await sendTelegramMessage(tgMsg);
    alert('Výsledky byly odeslány!');
  };

  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.stable || !profile?.birth_date) {
      alert("Než se přihlásíte, musíte mít v profilu kompletní údaje vč. data narození!");
      return;
    }
    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) {
      alert("Vyplňte jméno jezdce, závod, koně a aspoň jednu disciplínu.");
      return;
    }

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) return alert("Napište jméno koně!");
      const { data: newHorse } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName.trim(), birth_year: parseInt(newHorseBirthYear), license_number: newHorseLicense }])
        .select().single();
      finalHorseName = newHorse.name;
    }

    const { data: freshRegs } = await supabase.from('race_participants').select('start_number').eq('event_id', selectedEvent);
    const capacity = 200; 
    let assignedNumber = Math.floor(Math.random() * capacity) + 1; // Zjednodušené přiřazení EXH

    const registrationData = selectedDisciplines.map(d => {
      const assignedDraw = Math.floor(Math.random() * 60) + 1; // Zjednodušený los Draw
      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: customRiderName.trim(),
        age_category: riderAgeCategory,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: assignedDraw,
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    });

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (!error) {
      alert(`Přihláška odeslána!`);
      window.location.reload();
    }
  };

  const handleAdminHostRegistration = async (e) => {
    e.preventDefault();
    const capacity = 200;
    let assignedNumber = Math.floor(Math.random() * capacity) + 1;

    const discObj = pricing.find(p => p.discipline_name === hostDiscipline);
    if(!discObj) return alert('Zvolte disciplínu.');

    const { error } = await supabase.from('race_participants').insert([{
      user_id: user.id, // ID admina, který zakládá
      event_id: adminSelectedEvent,
      rider_name: hostRiderName,
      age_category: hostAgeCat,
      horse_name: hostHorseName,
      discipline: hostDiscipline,
      start_number: assignedNumber,
      draw_order: Math.floor(Math.random() * 60) + 1,
      price: discObj.price,
      is_paid: false,
      payment_note: 'Registrováno na místě'
    }]);

    if(error) alert(error.message);
    else {
      alert('Host přidán!');
      setHostRiderName(''); setHostHorseName('');
      checkUser();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit přihlášku?")) {
      await supabase.from('race_participants').delete().eq('id', id);
      window.location.reload();
    }
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLÍNA UZAVŘENA</b>\n\nPrávě bylo dokončeno hodnocení disciplíny <b>${discName}</b>.`);
        alert('Odesláno!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(0));
      setActualJudgeName(existingScore.actual_judge_name || '');
      setIsDQ(existingScore.is_dq || false);
    } else {
      setManeuverScores(Array(10).fill(0));
      setPenaltyScores(Array(10).fill(0));
      setActualJudgeName('');
      setIsDQ(false);
    }
  };

  const calculateTotalScore = () => {
    if(isDQ) return -999;
    const baseScore = 70;
    
    let isShowmanship = false;
    if(evaluatingParticipant) {
      const discL = evaluatingParticipant.discipline.toLowerCase();
      isShowmanship = discL.includes('showmanship') || discL.includes('horsemanship') || discL.includes('equitation');
    }
    
    // I Showmanship začíná na 70 podle nových pravidel
    let mTotal = maneuverScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    let pTotal = penaltyScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    return baseScore + mTotal - pTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    const scribeName = profile?.full_name || 'Neznámý zapisovatel';
    const timestamp = new Date().toISOString();

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id, // ID zapisovatele
      judge_name: scribeName, // Jméno zapisovatele
      actual_judge_name: actualJudgeName, // Skutečné jméno rozhodčího (text z pole)
      scored_at: timestamp,
      signature_hash: 'signed',
      score_data: scoreData,
      total_score: total,
      is_dq: isDQ
    });

    if (error) alert('Chyba při ukládání: ' + error.message);
    else {
      alert('Hodnocení bylo uloženo!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    // Najdeme disciplíny na startovce a seřadíme je podle sort_order v ceníku
    const registeredDisciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];
    const disciplines = registeredDisciplines.sort((a,b) => {
      const sA = pricing.find(x => x.discipline_name === a)?.sort_order || 999;
      const sB = pricing.find(x => x.discipline_name === b)?.sort_order || 999;
      return sA - sB;
    });

    return (
      <div className="print-area">
        {disciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádní jezdci.</p>
        ) : (
          disciplines.map(discipline => {
            const discData = pricing.find(p => p.discipline_name === discipline);
            const rawManeuvers = discData?.maneuver_names ? discData.maneuver_names.split(',') : [];
            const maneuversHeaders = Array.from({length: 10}, (_, i) => rawManeuvers[i] ? rawManeuvers[i].trim() : `${i+1}`);

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
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '40px', textAlign: 'center' }}>DRAW</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '40px', textAlign: 'center' }}>EXH#</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'left', minWidth: '150px' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '4px', width: '30px' }}></th>
                      <th colSpan="10" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', background: '#f5f5f5' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '60px', textAlign: 'center' }}>PENALTY<br/>TOTAL</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '60px', textAlign: 'center', fontSize: '1.1rem' }}>FINAL</th>
                    </tr>
                    <tr>
                      {maneuversHeaders.map((m, i) => (
                        <th key={i} style={{ border: '2px solid black', padding: '6px', width: '40px', textAlign: 'center', background: '#f5f5f5', fontSize: '0.75rem', wordWrap: 'break-word', maxWidth: '50px' }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const pTotal = scoreObj ? scoreObj.score_data.penalties.reduce((a,b)=>a+(parseFloat(b)||0),0) : '';
                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{r.draw_order}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', borderRight: '1px solid black' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{r.rider_name}</div>
                              <div style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>PEN</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => {
                              const pVal = scoreObj ? parseFloat(scoreObj.score_data.penalties[i]) : 0;
                              return (
                                <td key={`p-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', color: 'red', fontWeight: 'bold', height: '25px' }}>
                                  {pVal > 0 ? `-${pVal}` : ''}
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
                              const sVal = scoreObj ? parseFloat(scoreObj.score_data.maneuvers[i]) : 0;
                              return (
                                <td key={`s-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', height: '25px' }}>
                                  {sVal !== 0 ? (sVal > 0 ? `+${sVal}` : sVal) : ''}
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
                    <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Zapsal(a) do systému: {signatureObj ? signatureObj.judge_name : '_____'}</p>
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

  if (currentTab === 'rules') {
    return (
            <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Zpět do Aplikace</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: '#ffb300', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
        
        <div className="no-print" style={{...styles.card, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.6'}}>
          <h2 style={{color: '#5d4037', textAlign: 'center', marginTop: 0}}>WESTERNOVÉ HOBBY ZÁVODY POD HUMPRECHTEM</h2>
          <h3 style={{color: '#8d6e63', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '20px', marginBottom: '30px'}}>PROPOZICE</h3>
          {publicRulesText ? publicRulesText : 'Propozice k závodům zatím nebyly administrátorem vloženy.'}
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
          input, select, textarea { border: none !important; appearance: none !important; font-weight: bold; background: transparent !important; resize: none; overflow: hidden; }
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
          <strong>ADMIN LIŠTA:</strong> 
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin</button>
          <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Zapisovatel</button>
          <button onClick={() => setSimulatedRole('speaker')} style={effectiveRole === 'speaker' ? styles.activeTab : styles.tab}>Spíkr</button>
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hráč</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={{display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', margin: '0 auto'}}>
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
          
          <div style={{...styles.card, flex: 1, minWidth: '300px', background: '#fafafa', border: '1px solid #ddd'}}>
            <h3 style={{color: '#5d4037', marginTop: 0}}>Vypsané Disciplíny</h3>
            <p style={{fontSize: '0.85rem', color: '#666', borderBottom: '1px solid #ccc', paddingBottom: '10px'}}>Přihlaste se a uvidíte ceník. Zde naleznete přiložené pdf úlohy k nahlédnutí.</p>
            <ul style={{listStyleType: 'none', padding: 0, margin: 0, maxHeight: '250px', overflowY: 'auto'}}>
              {pricing.map(p => (
                <li key={p.id} style={{padding: '8px', borderBottom: '1px solid #eee', fontSize: '0.95rem'}}>
                  <strong>{p.discipline_name}</strong>
                  {p.pattern_url && (
                    <a href={p.pattern_url} target="_blank" rel="noreferrer" style={{display: 'block', color: '#0277bd', fontSize: '0.85rem', marginTop: '2px'}}>📄 Zobrazit úlohu</a>
                  )}
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
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Jméno a příjmení</label>
                <input style={styles.inputSmall} value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Datum narození</label>
                <input type="date" style={styles.inputSmall} value={profile?.birth_date || ''} onChange={e => setProfile({...profile, birth_date: e.target.value})} required/>
                
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Email (nelze měnit)</label>
                <input style={{...styles.inputSmall, background: '#eee'}} value={profile?.email || user?.email || ''} readOnly/>
                
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Telefon</label>
                <input style={styles.inputSmall} value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})}/>
                <button type="submit" style={{...styles.btnSave, width: '100%', marginTop: '10px'}}>Uložit změny v profilu</button>
                <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnOutline, width: '100%'}}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p style={{fontSize: '1.2rem'}}><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                <p>Narozen(a): {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('cs-CZ') : <span style={{color: 'red'}}>Nutno doplnit!</span>}</p>
                <p>Tel: {profile?.phone || '-'}</p>
                {( !profile?.full_name || !profile?.birth_date ) && (
                  <p style={{color: '#e57373', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Dokončete svůj profil, ať se můžete přihlásit k okénkům závodů.</p>
                )}
                <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
              </div>
            )}
          </div>

          <div className="print-area" style={styles.card}>
            
            {/* ADMIN POHLED */}
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div className="no-print" style={{marginBottom: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>
                  <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '5px'}}>
                    <button onClick={() => setAdminSelectedEvent('')} style={!adminSelectedEvent ? styles.activeTab : styles.tab}>Všeobecná správa</button>
                    <button onClick={() => setAdminSelectedEvent('rules')} style={adminSelectedEvent === 'rules' ? styles.activeTab : styles.tab}>Upravit Propozice</button>
                    {effectiveRole === 'superadmin' && (
                      <button onClick={() => setAdminSelectedEvent('accounts')} style={adminSelectedEvent === 'accounts' ? {...styles.activeTab, background: '#e65100'} : {...styles.tab, background: '#e65100'}}>Vygenerovat Přístupy</button>
                    )}
                    {events.map(ev => (
                      <button key={ev.id} onClick={() => setAdminSelectedEvent(ev.id)} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                        Závod: {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!adminSelectedEvent && (
                  <div className="no-print">
                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Vypsání nových termínů závodů</h4>
                      <form onSubmit={handleCreateEvent} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Název (např. Jaro 2026)" value={newEventName} onChange={e => setNewEventName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={{...styles.inputSmall, width: 'auto'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <span style={{fontSize:'0.8rem'}}>Od čísla:</span>
                          <input type="number" value={newStartNumFrom} onChange={e => setNewStartNumFrom(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                          <span style={{fontSize:'0.8rem'}}>do:</span>
                          <input type="number" value={newStartNumTo} onChange={e => setNewStartNumTo(e.target.value)} style={{...styles.inputSmall, width: '70px'}} required/>
                        </div>
                        <button type="submit" style={styles.btnSave}>Přidat závod k registraci</button>
                      </form>
                      <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#eee', textAlign: 'left'}}>
                            <th style={{padding: '8px'}}>Název</th>
                            <th style={{padding: '8px'}}>Datum</th>
                            <th style={{padding: '8px'}}>Stav</th>
                            <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(ev => (
                            <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                              <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                              <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString()}</td>
                              <td style={{padding: '8px', color: ev.is_locked ? '#e65100' : '#2e7d32', fontWeight: 'bold'}}>
                                {ev.is_locked ? 'Přihlášky ZAVŘENY' : 'Přihlášky Běží'}
                              </td>
                              <td style={{padding: '8px', textAlign: 'center'}}>
                                <button onClick={() => toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}>
                                  {ev.is_locked ? 'Odemknout Startku' : 'Uzamknout a Předat rozhodčímu'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Disciplíny, Ceník a Tvorba kolonek manévrů</h4>
                      <p style={{fontSize: '0.8rem', color:'#666'}}>Vyplňte seznam manévrů oddělený čárkou, aby se tiskl na Scoresheetu. (např: "Kruh P, Spin, Stop, Couvání"). Pokud necháte prázdné, zapíše se Manévr 1..10</p>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="number" placeholder="Pořadí" value={newDiscSort} onChange={e => setNewDiscSort(e.target.value)} style={{...styles.inputSmall, width: '70px'}} title="Tímto se disciplíny seřadí u Hlasatele a na Tisk"/>
                        <input type="text" placeholder="Nová disciplína (přesně podle propozic)" value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena Kč" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <label style={{fontSize: '0.85rem'}}>Vzor úlohy:</label>
                          <input type="file" accept=".pdf,image/*" onChange={e => setPatternFile(e.target.files[0])} style={{...styles.inputSmall, width: '150px'}} />
                        </div>
                        <button type="submit" style={{...styles.btnSave, background: '#0277bd'}}>Přidat položku ceníku</button>
                      </form>

                      <div style={{overflowX: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                        <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                          <thead style={{background: '#e0e0e0'}}>
                            <tr style={{textAlign: 'left'}}>
                              <th style={{padding: '10px', width: '50px'}}>#</th>
                              <th style={{padding: '10px'}}>Disciplína</th>
                              <th style={{padding: '10px', width: '80px'}}>Cena</th>
                              <th style={{padding: '10px'}}>Vlastní manévry pro tisk / Úloha</th>
                              <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map(p => (
                              <tr key={p.id} style={{borderBottom: '1px solid #eee', background: editingPricingId === p.id ? '#fff9c4' : 'transparent'}}>
                                {editingPricingId === p.id ? (
                                  <>
                                    <td style={{padding: '10px'}}><input type="number" value={editDiscSort} onChange={e => setEditDiscSort(e.target.value)} style={{...styles.inputSmall, width: '50px'}} /></td>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{p.discipline_name}</td>
                                    <td style={{padding: '10px'}}><input type="number" value={editDiscPrice} onChange={e => setEditDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '70px'}} /></td>
                                    <td style={{padding: '10px'}}>
                                      <input type="text" placeholder="Manévry s čárkou (Kruh, Spin...)" value={editDiscManeuvers} onChange={e => setEditDiscManeuvers(e.target.value)} style={{...styles.inputSmall, width: '100%'}} />
                                      <input type="file" accept=".pdf,image/*" onChange={e => setEditPatternFile(e.target.files[0])} style={{width: '130px', fontSize: '0.75rem', marginTop: '5px'}} />
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={() => handleSaveEditPricing(p.id, p.discipline_name)} style={{...styles.btnSave, padding: '5px 10px', display: 'block', marginBottom: '5px', width: '100%'}}>Uložit</button>
                                      <button onClick={() => setEditingPricingId(null)} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{padding: '10px', color: '#888'}}>{p.sort_order}</td>
                                    <td style={{padding: '10px'}}><strong>{p.discipline_name}</strong></td>
                                    <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                                    <td style={{padding: '10px', color: '#555', fontStyle: 'italic'}}>
                                      {p.maneuver_names ? p.maneuver_names.substring(0, 30) + '...' : 'Manévr 1..10'} 
                                      {p.pattern_url && <a href={p.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0288d1', display: 'inline-block', marginLeft: '10px'}}>(Úloha)</a>}
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={() => startEditingPricing(p)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>Upravit</button>
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

                {adminSelectedEvent === 'rules' && (
                  <div className="no-print">
                    <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #ffb300', margin: '20px 0'}}>
                      <h3 style={{marginTop: 0, color: '#e65100'}}>Úprava oficiálních propozic</h3>
                      <p>Zde upravte kompletní znění propozic na sezónu. Změna se promítne všem ihned na webu.</p>
                      <textarea 
                        value={editRulesText} 
                        onChange={e => setEditRulesText(e.target.value)} 
                        rows="25" 
                        style={{width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical'}} 
                      />
                      <button onClick={handleUpdateRules} style={{...styles.btnSave, background: '#e65100', marginTop: '15px', fontSize: '1.1rem', padding: '10px 20px'}}>Uložit propozice a zvěřejnit pro všechny</button>
                    </div>
                  </div>
                )}

                {adminSelectedEvent === 'accounts' && effectiveRole === 'superadmin' && (
                  <div className="no-print">
                    <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #e65100', margin: '20px 0'}}>
                      <h3 style={{color: '#e65100', marginTop: 0}}>Generátor přístupů pro personál</h3>
                      <form onSubmit={handleCreateAccount} style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                        <input type="email" placeholder="E-mail personálu" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)} style={styles.inputSmall} required/>
                        <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={styles.inputSmall}>
                          <option value="judge">Zapisovatel (u rozhodčího)</option>
                          <option value="speaker">Hlasatel (na věži)</option>
                          <option value="admin">Administrátor závodu</option>
                        </select>
                        <button type="submit" style={{...styles.btnSave, background: '#e65100'}}>Odeslat heslo na e-mail</button>
                      </form>
                    </div>
                  </div>
                )}

                {adminSelectedEvent && adminSelectedEvent !== 'rules' && adminSelectedEvent !== 'accounts' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Rychlý Vzkaz (vidí jen Hlasatel a Rozhodčí):</strong>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === adminSelectedEvent)?.speaker_message || 'Žádný vzkaz.'}</span>
                      </div>
                      <button onClick={() => handleUpdateSpeakerMessage(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Poslat/Upravit vzkaz</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '10px'}}>📋 Časový Plán (Vidí všichni - odřádkování přes Enter):</strong>
                      <textarea 
                         value={events.find(e => e.id === adminSelectedEvent)?.schedule || ''} 
                         onChange={(e) => {
                            const newEvents = events.map(ev => ev.id === adminSelectedEvent ? {...ev, schedule: e.target.value} : ev);
                            setEvents(newEvents);
                         }}
                         rows={4}
                         style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem'}}
                      />
                      <button onClick={() => handleUpdateSchedule(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.schedule)} style={{...styles.btnOutline, marginTop: '10px'}}>Pevně uložit Časový plán</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#e1f5fe', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1'}}>
                      <h4 style={{marginTop: 0, color: '#0288d1', marginBottom: '10px'}}>Registrace jezdce na místě u stolku (Host)</h4>
                      <form onSubmit={handleAdminHostRegistration} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <input type="text" placeholder="Jméno jezdce" value={hostRiderName} onChange={e=>setHostRiderName(e.target.value)} required style={styles.inputSmall}/>
                        <select value={hostAgeCat} onChange={e=>setHostAgeCat(e.target.value)} style={styles.inputSmall}>
                          <option value="18+">18 a více let (Open)</option>
                          <option value="Pokročilí">Pokročilí (Mládež)</option>
                          <option value="Začátečníci">Začátečníci (Mládež)</option>
                          <option value="Děti">Děti do 12</option>
                          <option value="Hříbata">Hříbata</option>
                        </select>
                        <input type="text" placeholder="Jméno Koně" value={hostHorseName} onChange={e=>setHostHorseName(e.target.value)} required style={styles.inputSmall}/>
                        <select value={hostDiscipline} onChange={e=>setHostDiscipline(e.target.value)} required style={styles.inputSmall}>
                          <option value="">Zvolte disciplínu</option>
                          {pricing.map(p => <option key={p.id} value={p.discipline_name}>{p.discipline_name}</option>)}
                        </select>
                        <button type="submit" style={{...styles.btnSave, background: '#0288d1'}}>Zapsat na Startku</button>
                      </form>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#fff9c4', padding: '20px', borderRadius: '8px', border: '2px solid #fbc02d', textAlign: 'center'}}>
                      <h3 style={{margin: '0 0 10px 0', color: '#f57f17'}}>Ceremoniální konec závodů</h3>
                      <button onClick={() => handleEndCompetitionAndSendResults(adminSelectedEvent)} style={{...styles.btnSave, background: '#fbc02d', color: '#000', fontSize: '1.2rem', padding: '15px 30px'}}>🏆 Definitivně Ukončit a vyhlásit na Telegramu</button>
                    </div>

                    <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 className="no-print" style={{margin: 0}}>Předběžná startovka</h4>
                        <h2 style={{display: 'none', margin: '0 0 20px 0', textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px'}} className="print-only">Startovní listina: {events.find(e => e.id === adminSelectedEvent)?.name}</h2>
                        <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Tisknout Startku</button>
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
                              <th className="no-print" style={{padding: '8px'}}>Pozn. Platba</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRegistrations.filter(r => r.event_id === adminSelectedEvent).sort((a,b)=>a.draw_order - b.draw_order).map((r, i) => (
                              <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                <td style={{padding: '8px'}}><strong>{r.draw_order || '-'}</strong></td>
                                <td style={{padding: '8px'}}>{r.age_category}</td>
                                <td style={{padding: '8px'}}>{r.rider_name}</td>
                                <td style={{padding: '8px'}}>{r.horse_name}</td>
                                <td style={{padding: '8px'}}>{r.discipline}</td>
                                <td className="no-print" style={{padding: '8px'}}>
                                  <input 
                                    type="text" 
                                    defaultValue={r.payment_note || ''} 
                                    onBlur={(e) => updatePaymentNote(r.id, e.target.value, r.rider_name)} 
                                    placeholder="např. Hotově"
                                    style={{padding: '5px', width: '120px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
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
                        <h4 style={{margin: 0}}>Velké Scoresheety k tisku (pro rozhodčího na odškrtnutí)</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Tisk Scoresheetů</button>
                      </div>
                      {renderPrintableScoresheets(adminSelectedEvent)}
                    </div>
                  </div>
                )}
                
                {effectiveRole === 'superadmin' && !adminSelectedEvent && (
                  <div className="no-print" style={{...styles.adminSection, border: '2px solid #000', background: '#e0e0e0', marginTop: '20px'}}>
                    <h4 style={{margin: '0 0 10px 0'}}>Logy systému pro audit</h4>
                    <div style={{maxHeight: '300px', overflowY: 'auto', background: '#fff', padding: '10px'}}>
                      {systemLogs.length === 0 ? <p>Žádné záznamy.</p> : (
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

            {/* POHLED ZAPISOVATELE / ROZHODČÍHO */}
            {effectiveRole === 'judge' && (
              <div className={printMode ? 'print-area' : ''}>
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd', fontSize: '1.6rem'}}>Zadávání známek (Zapisovatel)</h3>
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div>
                      <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz (společný se Spíkrem):</strong>
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === judgeEvent)?.speaker_message || 'Žádná zpráva'}</span>
                    </div>
                    <button onClick={() => handleUpdateSpeakerMessage(judgeEvent, events.find(e => e.id === judgeEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                  </div>
                )}
                
                <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                  {evaluatingParticipant ? (
                    <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '2px solid #0277bd', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      
                      <div style={{flex: 2, minWidth: '300px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '15px'}}>
                          <h2 style={{marginTop: 0, margin: 0}}>{evaluatingParticipant.discipline}</h2>
                          <h2 style={{marginTop: 0, margin: 0, color: '#e65100'}}>Záda: {evaluatingParticipant.start_number} (Draw: {evaluatingParticipant.draw_order})</h2>
                        </div>
                        <p style={{fontSize: '1.3rem', marginBottom: '10px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> ({evaluatingParticipant.age_category})</p>
                        <p style={{fontSize: '1.1rem', marginBottom: '20px', color: '#666'}}>Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>

                        <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #ccc'}}>
                          <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>Skutečné Jméno Rozhodčího (Diktujícího):</label>
                          <input type="text" value={actualJudgeName} onChange={e => setActualJudgeName(e.target.value)} style={{...styles.input, marginTop: 0, border: '2px solid #ccc'}} placeholder="Např. Ing. Jan Novák" />
                        </div>
                        
                        <div style={{background: '#ffe0b2', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px'}}>
                           <input type="checkbox" checked={isDQ} onChange={e => setIsDQ(e.target.checked)} id="dqCheck" style={{width: '25px', height: '25px'}} />
                           <label htmlFor="dqCheck" style={{color: '#d84315', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer'}}>DISKVALIFIKACE (DQ)</label>
                        </div>

                        {!isDQ && (
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                            <div>
                              <h4 style={{borderBottom: '2px solid #4caf50', paddingBottom: '5px'}}>➕ Známky za Manévry</h4>
                              {maneuverScores.map((score, index) => {
                                const discPricing = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline);
                                const customManeuvers = discPricing?.maneuver_names ? discPricing.maneuver_names.split(',') : [];
                                const maneuverName = customManeuvers[index] ? customManeuvers[index].trim() : `Box č. ${index + 1}`;
                                const isShow = (evaluatingParticipant.discipline.toLowerCase().includes('showmanship') || evaluatingParticipant.discipline.toLowerCase().includes('horsemanship'));
                                return (
                                  <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', background: '#f1f8e9', padding: '8px', borderRadius: '4px'}}>
                                    <strong>{maneuverName}</strong>
                                    <select value={score} onChange={(e) => { const x = [...maneuverScores]; x[index] = e.target.value; setManeuverScores(x); }} style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', fontSize: '1.2rem', width: '130px'}}>
                                      {isShow ? (
                                        <>
                                          <option value="3">+3 (Excelentní)</option>
                                          <option value="2">+2 (Velmi dobré)</option>
                                          <option value="1">+1 (Dobré)</option>
                                          <option value="0">0 (Průměrné)</option>
                                          <option value="-1">-1 (Slabé)</option>
                                          <option value="-2">-2 (Velmi slabé)</option>
                                          <option value="-3">-3 (Extrámně špatné)</option>
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
                              <h4 style={{borderBottom: '2px solid #f44336', paddingBottom: '5px'}}>➖ Trestné Body (Penalty)</h4>
                              {penaltyScores.map((penalty, index) => (
                                <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', background: '#ffebee', padding: '8px', borderRadius: '4px'}}>
                                  <strong>Minus k boxu {index + 1}</strong>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    step="0.5" 
                                    value={penalty || ''} 
                                    onChange={(e) => { const x = [...penaltyScores]; x[index] = e.target.value || 0; setPenaltyScores(x); }} 
                                    style={{padding: '8px', width: '80px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'}}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{marginTop: '30px', padding: '15px', background: '#e1f5fe', borderRadius: '8px', textAlign: 'right', border: '3px solid #0277bd'}}>
                          <span style={{fontSize: '1.2rem', color: '#000'}}>Základ WRC: 70 | </span>
                          <strong style={{fontSize: '1.8rem', color: '#000'}}>AUTO-SOUČET: {calculateTotalScore() === -999 ? 'DQ' : calculateTotalScore()}</strong>
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                          <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.2rem'}}>Potvrdit a zapsat hodnocení</button>
                          <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 0.5, marginTop: 0}}>Zpět bez změny</button>
                        </div>
                      </div>

                      <div className="no-print" style={{flex: 1, minWidth: '250px', background: '#fff9c4', padding: '15px', borderRadius: '8px', border: '1px solid #fbc02d', height: 'fit-content', position: 'sticky', top: '10px'}}>
                        <h4 style={{marginTop: 0, color: '#f57f17', borderBottom: '1px solid #fbc02d', paddingBottom: '5px'}}>Tahák k pravidlům z Propozic</h4>
                        <ul style={{paddingLeft: '20px', fontSize: '0.95rem', color: '#333'}}>
                          {getRulesForDiscipline(evaluatingParticipant.discipline).map((rule, idx) => (
                            <li key={idx} style={{marginBottom: '10px'}}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{...styles.label, fontSize: '1.1rem'}}>1. Otevřít zamčený probíhající závod:</label>
                      <select style={{...styles.input, fontSize: '1.1rem', padding: '12px'}} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                        <option value="">-- Zvolte závod ke spravování --</option>
                        {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>

                      {judgeEvent && (
                        <div style={{marginTop: '15px'}}>
                          <label style={{...styles.label, fontSize: '1.1rem'}}>2. Vyberte disciplínu před sebou na obdélníku (Ukáže se to i Hlasateli nahoře!):</label>
                          <select style={{...styles.input, fontSize: '1.1rem', padding: '12px', background: '#e1f5fe'}} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                            <option value="">-- Zatím nepípáme, čeká se --</option>
                            {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}

                      {judgeEvent && judgeDiscipline && (
                        <div style={{marginTop: '30px'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #0277bd', paddingBottom: '10px'}}>
                            <h4 style={{margin: 0, fontSize: '1.3rem'}}>Startovka k hodnocení: {judgeDiscipline}</h4>
                            <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0, padding: '10px 15px', fontWeight: 'bold'}}>📣 Zapískat: Konec disciplíny pro Hlasatele a jezdce</button>
                          </div>
                          
                          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '1.1rem'}}>
                            <thead>
                              <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                                <th style={{padding: '12px'}}>Draw</th>
                                <th style={{padding: '12px'}}>S/N Záda</th>
                                <th style={{padding: '12px'}}>Jezdec (Kategorie)</th>
                                <th style={{padding: '12px'}}>Kůň</th>
                                <th style={{padding: '12px', textAlign: 'center'}}>Nástroj pro zápis</th>
                              </tr>
                            </thead>
                            <tbody>
                              {judgeStartList.length > 0 ? judgeStartList.map(r => {
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                const isScored = !!scoreObj;
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '2px solid #eee', background: isScored ? '#f1f8e9' : 'transparent'}}>
                                    <td style={{padding: '12px', fontWeight: 'bold', color: '#0277bd', fontSize: '1.2rem'}}>{r.draw_order}.</td>
                                    <td style={{padding: '12px', fontWeight: '900', fontSize: '1.3rem'}}>{r.start_number}</td>
                                    <td style={{padding: '12px'}}>{r.rider_name} <span style={{fontSize: '0.8rem', color: '#888'}}>({r.age_category})</span></td>
                                    <td style={{padding: '12px'}}>{r.horse_name}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                      {isScored ? (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '8px 15px', border: '2px solid #4caf50', color: '#4caf50', fontWeight: 'bold'}}>
                                          {scoreObj.is_dq ? 'Opravit (DQ)' : `Opravit arch (${scoreObj.total_score})`}
                                        </button>
                                      ) : (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd', padding: '10px 15px', fontWeight: 'bold'}}>Zadat Jízdu</button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }) : (
                                <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', color: '#888'}}>V této kategorii zatím nikdo nefiguruje ze startky.</td></tr>
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
                      <h4 style={{margin: 0}}>Velké Scoresheety pro tisk k odškrtávání</h4>
                      <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Tisk PDF Archů</button>
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
                  <h3 style={{marginTop: 0, color: '#5d4037'}}>Panel Hlasatele (Zrcadlo od Rozhodčích a Vedení)</h3>
                </div>
                
                {speakerEventId ? (
                  <div>
                    <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', whiteSpace: 'pre-wrap'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Dnešní Časový Plán:</strong>
                      <span style={{fontSize: '1.1rem'}}>{lockedEvent?.schedule || 'Harmonogram ještě nebyl vložen.'}</span>
                    </div>

                    {lockedEvent?.speaker_message && (
                      <div style={{background: '#ffe0b2', border: '4px solid #e65100', padding: '20px', borderRadius: '12px', marginTop: '10px', marginBottom: '30px', textAlign: 'center'}}>
                        <h3 style={{margin: '0 0 10px 0', color: '#e65100', textTransform: 'uppercase', letterSpacing: '2px'}}>🚨 Vzkaz ze stolu pro věž:</h3>
                        <p style={{fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#e65100'}}>
                          {lockedEvent?.speaker_message}
                        </p>
                      </div>
                    )}

                    {!speakerDiscipline ? (
                      <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '3px dashed #ccc'}}>
                        <h2 style={{color: '#555', margin: 0}}>Čekáme na pískoviště - zatím nebyla odpípnuta disciplína.</h2>
                        <p style={{fontSize: '1.1rem', color: '#888'}}>Jakmile zapisovatel vybere disciplínu, objeví se zde živá tabule a pořadí startů.</p>
                      </div>
                    ) : (
                      <div style={{marginTop: '30px'}}>
                        <h2 style={{fontSize: '2rem', textAlign: 'center', color: '#5d4037', borderBottom: '4px solid #5d4037', paddingBottom: '15px', textTransform: 'uppercase'}}>🎤 NA TRASE: {speakerDiscipline}</h2>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                          <thead>
                            <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                              <th style={{padding: '15px'}}>Draw</th>
                              <th style={{padding: '15px'}}>Záda</th>
                              <th style={{padding: '15px'}}>Jezdec (Kategorie) / Kůň</th>
                              <th style={{padding: '15px', textAlign: 'right'}}>Skóre zapsané systémem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {speakerStartList.length > 0 ? speakerStartList.map(r => {
                              const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                              const isScored = !!scoreObj;
                              
                              return (
                                <tr key={r.id} style={{borderBottom: '3px solid #eee', fontSize: '1.4rem', background: isScored ? '#e8f5e9' : '#fff'}}>
                                  <td style={{padding: '15px', fontWeight: 'bold', color: '#795548'}}>{r.draw_order}.</td>
                                  <td style={{padding: '15px', fontWeight: '900', fontSize: '1.8rem'}}>{r.start_number}</td>
                                  <td style={{padding: '15px'}}>
                                    <div style={{fontWeight: 'bold'}}>{r.rider_name} <span style={{fontSize: '1rem', color: '#666', fontWeight: 'normal'}}>({r.age_category})</span></div>
                                    <div style={{fontSize: '1.1rem', color: '#5d4037', marginTop: '5px'}}>{r.horse_name}</div>
                                  </td>
                                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                    {isScored ? (scoreObj.is_dq ? 'DQ' : `${scoreObj.total_score} Bodů`) : 'Nezapsáno (Na trati / Čeká)'}
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center', fontSize: '1.2rem'}}>V této disciplíně teď nefiguruje žádný jezdec.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{textAlign: 'center', padding: '30px', color: '#666', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1.2rem'}}>Aktuálně není k nalezení žádný probíhající závod.</p>
                )}
              </div>
            )}

            {/* POHLED KLASICKÉHO JEZDCE (Player) */}
            {effectiveRole === 'player' && (
              <div className="no-print">
                
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Nové přihlášky na Závod + Moje Jízdy</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Trakce a Živé info Telegram</button>
                </div>

                {playerTab === 'telegram' && (
                  <div style={{background: '#e3f2fd', padding: '30px 20px', borderRadius: '8px', border: '1px solid #0288d1', textAlign: 'center', margin: '20px 0'}}>
                    <h2 style={{color: '#0288d1', marginTop: 0}}>📱 Sledujte hlášení, plán a okamžité výsledky!</h2>
                    <p style={{fontSize: '1.1rem', color: '#333', marginBottom: '20px'}}>Sleduj naši oficiální vývěsku na Telegramu, ať nejsi o nic ochuzený.</p>
                    <a href="https://t.me/+xZ7MOtlAaX05YzA0" target="_blank" rel="noopener noreferrer" style={{...styles.btnSave, background: '#0288d1', textDecoration: 'none', display: 'inline-block', fontSize: '1.2rem', padding: '15px 30px', fontWeight: 'bold'}}>Sledovat Telegram Skupinu</a>
                  </div>
                )}

                {playerTab === 'main' && (
                  <div>
                    <div style={{background: '#fff3e0', padding: '20px', borderRadius: '12px', border: '2px solid #ffb300', marginBottom: '30px'}}>
                      <h3 style={{marginTop: 0, color: '#e65100', borderBottom: '1px solid #ffb300', paddingBottom: '10px'}}>Vytvořit online přihlášku z profilu</h3>
                      
                      <div style={{display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '20px', marginBottom: '20px', marginTop: '15px'}}>
                        <div>
                          <label style={{...styles.label, marginTop: 0, color: '#e65100'}}>Vyberte aktuálně vypsaný závod z kalendáře:</label>
                          <select style={{...styles.input, border: '2px solid #ffb300'}} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                            <option value="">-- Termíny k přihlašování --</option>
                            {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString('cs-CZ')})</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{...styles.label, marginTop: 0, color: '#e65100'}}>Jak se Jezdec reálně jmenuje:</label>
                          <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={{...styles.input, border: '2px solid #ffb300'}} placeholder="Napiš jméno..." />
                        </div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '20px', marginBottom: '20px'}}>
                        <div>
                          <label style={{...styles.label, marginTop: 0, color: '#e65100'}}>Věková Kategorie jezdce:</label>
                          <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={{...styles.input, border: '2px solid #ffb300'}}>
                            <option value="18+">18 a více let (Open)</option>
                            <option value="Pokročilí">Pokročilí (Mládež - Advanced)</option>
                            <option value="Začátečníci">Začátečníci (Mládež - Rookies)</option>
                            <option value="Děti">Děti do 12 let</option>
                            <option value="Hříbata">Hříbata</option>
                          </select>
                        </div>
                        <div>
                          <label style={{...styles.label, marginTop: 0, color: '#e65100'}}>Koník vybraný pro tenhle den:</label>
                          <select style={{...styles.input, border: '2px solid #ffb300'}} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                            <option value="">-- Můj uložený kůň z DB --</option>
                            {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                            <option value="new">+ Registruji si zbrusu nového koně do stáje...</option>
                          </select>
                        </div>
                      </div>

                      {selectedHorse === 'new' && (
                        <div style={{background: '#ffecb3', padding: '15px', borderRadius: '8px', border: '1px dashed #ffb300', marginBottom: '20px'}}>
                          <label style={{fontWeight: 'bold', color: '#e65100'}}>Doplňující údaje zvířete (Pamatuje si to dál profil):</label>
                          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px'}}>
                            <input type="text" placeholder="Papírové Jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.inputSmall, flex: 2, minWidth: '150px'}} />
                            <input type="number" placeholder="Rok Narození..." value={newHorseBirthYear} onChange={e => setNewHorseBirthYear(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '110px'}} />
                            <input type="text" placeholder="Licenční průkaz koně..." value={newHorseLicense} onChange={e => setNewHorseLicense(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '130px'}} />
                          </div>
                        </div>
                      )}

                      <label style={{...styles.label, fontSize: '1.2rem', borderBottom: '2px solid #ffb300', paddingBottom: '10px', marginBottom: '15px', color: '#e65100'}}>Vyberte Disciplíny k odjetí z Ceníku:</label>
                      {pricing.length === 0 ? <p style={{color: 'red'}}>Závodní disciplíny se teprve připravují, zatím nic.</p> : (
                        <div style={styles.disciplineList}>
                          {pricing.map(d => (
                            <div key={d.id} style={{display: 'flex', flexDirection: 'column', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff', border: selectedDisciplines.find(x => x.id === d.id) ? '2px solid #5d4037' : '1px solid #ddd', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden'}}>
                              <div onClick={() => {
                                const exists = selectedDisciplines.find(x => x.id === d.id);
                                setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                              }} style={{...styles.disciplineItem, borderBottom: 'none'}}>
                                <span style={{fontWeight: selectedDisciplines.find(x => x.id === d.id) ? 'bold' : 'normal', fontSize: '1.1rem'}}>{d.discipline_name}</span>
                                <strong style={{color: '#5d4037', fontSize: '1.2rem'}}>{d.price} Kč</strong>
                              </div>
                              {d.pattern_url && (
                                <div style={{padding: '0 15px 15px 15px', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                                  <a href={d.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0288d1', fontSize: '0.9rem', fontWeight: 'bold'}}>📄 Zobrazit přiložený plánek úlohy (PDF/JPG)</a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div style={styles.priceTag}>
                        Košíček k platbě u Stolu: <span style={{fontSize: '1.6rem', color: '#e65100'}}>{selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč</span>
                      </div>

                      <button onClick={handleRaceRegistration} style={{...styles.btnSecondary, background: '#ff9800', color: '#000', fontSize: '1.3rem', padding: '20px'}}>
                        ZAREGISTROVAT TYTO DISCIPLÍNY DO KANCELÁŘE
                      </button>
                    </div>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '3px solid #8d6e63', paddingBottom: '10px', fontSize: '1.4rem'}}>Sloh a stav mých dnešních nasazení v Aréně:</h3>
                        
                        {events.filter(e => allRegistrations.filter(r => r.user_id === user?.id).some(r => r.event_id === e.id) && e.schedule).map(ev => (
                          <div key={ev.id} style={{background: '#f5f5f5', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '6px solid #8d6e63', whiteSpace: 'pre-wrap'}}>
                            <strong style={{color: '#5d4037', fontSize: '1.1rem', display: 'block', marginBottom: '5px'}}>Organizační Časoběžný plánek pro závod ({ev.name}):</strong>
                            <span style={{fontSize: '1.1rem'}}>{ev.schedule}</span>
                          </div>
                        ))}

                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '1rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                            <thead>
                              <tr style={{background: '#d7ccc8', textAlign: 'left'}}>
                                <th style={{padding: '12px'}}>Co pojedu za Disciplínu</th>
                                <th style={{padding: '12px', width: '100px'}}>St. Číslo</th>
                                <th style={{padding: '12px'}}>Na Koníkovi</th>
                                <th style={{padding: '12px'}}>Získané Bodování</th>
                                <th style={{padding: '12px', textAlign: 'center'}}>Stornování</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                                const eventObj = events.find(e => e.id === r.event_id);
                                const isEventLocked = eventObj?.is_locked || false;
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '2px solid #eee', background: '#fff'}}>
                                    <td style={{padding: '12px'}}><strong>{r.discipline}</strong></td>
                                    <td style={{padding: '12px', fontSize: '1.4rem', fontWeight: '900', color: '#5d4037'}}>{r.start_number}</td>
                                    <td style={{padding: '12px'}}>{r.horse_name} <br/><span style={{fontSize: '0.8.5rem', color:'#888'}}>jezdec: {r.rider_name}</span></td>
                                    <td style={{padding: '12px', fontWeight: 'bold', color: scoreObj ? (scoreObj.is_dq ? '#d84315' : '#2e7d32') : '#888', fontSize: '1.2rem'}}>
                                      {scoreObj ? (scoreObj.is_dq ? 'DQ' : scoreObj.total_score) : 'Čeká se na trať'}
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                      {!isEventLocked ? (
                                        <button onClick={() => handleCancelRegistration(r.id)} style={{background: '#ffebee', border: '1px solid #ef5350', color: '#c62828', cursor: 'pointer', fontWeight: 'bold', padding: '8px 15px', borderRadius: '4px'}}>Zrušit přihlášku z věže</button>
                                      ) : (
                                        <span style={{color: '#fff', background: '#bdbdbd', padding: '5px 10px', borderRadius: '4px', fontSize: '0.85rem'}}>Již Uzamčeno</span>
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
  tab: { background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  activeTab: { background: '#4caf50', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  brandHeader: { textAlign: 'center', marginBottom: '20px' },
  logo: { width: '120px', borderRadius: '50%', border: '4px solid #5d4037' },
  title: { color: '#5d4037', margin: '10px 0 0 0' },
  subtitle: { color: '#8d6e63', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '25px', maxWidth: '1300px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', margin: '0 auto', maxWidth: '100%', width: '100%' },
  sideCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', borderTop: '5px solid #5d4037', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' },
  adminSection: { padding: '20px', border: '1px solid #ddd', borderRadius: '12px', marginBottom: '20px', background: '#fafafa' },
  input: { width: '100%', padding: '14px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
  label: { fontSize: '0.95rem', fontWeight: 'bold', color: '#5d4037', display: 'block', marginTop: '15px' },
  btnPrimary: { width: '100%', padding: '16px', background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', fontSize: '1.1rem' },
  btnSecondary: { width: '100%', padding: '15px', background: '#8d6e63', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  btnSignOut: { width: '100%', padding: '12px', background: '#e57373', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' },
  btnOutline: { width: '100%', padding: '12px', background: 'transparent', border: '2px solid #5d4037', color: '#0277bd', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' },
  btnSave: { padding: '12px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' },
  btnText: { background: 'none', border: 'none', color: '#8d6e63', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.95rem', marginTop: '15px', display: 'block', width: '100%', textAlign: 'center' },
  disciplineList: { maxHeight: '350px', overflowY: 'auto', padding: '5px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '15px', cursor: 'pointer', alignItems: 'center' },
  priceTag: { marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4', fontSize: '1.5rem', color: '#5d4037', fontWeight: 'bold' }
};
