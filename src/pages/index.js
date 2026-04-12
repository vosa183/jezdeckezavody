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
    "POZOR: Tato disciplína se hodnotí od -3 (Extrémně špatné) do +3 (Excelentní) pouze v CELÝCH BODECH!",
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  
  // REGISTRACE HRÁČE (PŘIDÁNA NOVÁ POLE)
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [riderBirthDate, setRiderBirthDate] = useState('');
  const [horseBirthDate, setHorseBirthDate] = useState('');
  const [horseIdNumber, setHorseIdNumber] = useState('');
  
  // OFFLINE REGISTRACE ADMINEM
  const [offlineRiderName, setOfflineRiderName] = useState('');
  const [offlineHorseName, setOfflineHorseName] = useState('');
  const [offlineAgeCategory, setOfflineAgeCategory] = useState('18+');
  const [offlineRiderBirthDate, setOfflineRiderBirthDate] = useState('');
  const [offlineHorseBirthDate, setOfflineHorseBirthDate] = useState('');
  const [offlineHorseIdNumber, setOfflineHorseIdNumber] = useState('');

  // STAVY PRO INLINE EDITACI CENÍKU (PŘIDÁNO ŘAZENÍ)
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editManeuvers, setEditManeuvers] = useState(''); 
  const [editDiscOrder, setEditDiscOrder] = useState('');
  
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  // VYTVÁŘENÍ ZÁVODŮ A CENÍKU
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [newDiscOrder, setNewDiscOrder] = useState('0');
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');

  // ZAPISOVATEL (SCRIBE) + PŘIDÁNO DQ
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill('0')); 
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill('')); 
  const [judgeManeuversText, setJudgeManeuversText] = useState(''); 
  const [actualJudgeName, setActualJudgeName] = useState('');
  const [isDq, setIsDq] = useState(false);

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  useEffect(() => {
    checkUser();
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      if (hash.includes('type=recovery') || urlParams.get('type') === 'recovery') {
        setIsResettingPassword(true);
        setCurrentTab('app');
      }
    }
  }, []);

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
    await supabase.from('system_logs').insert([{ user_id: user.id, action: actionDesc, details: detailData }]);
  };

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', authUser.id);
        setMyHorses(horses || []);

        const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        setEvents(evts || []);

        const { data: prices } = await supabase.from('pricing').select('*').order('order_index', { ascending: true });
        setPricing(prices || []);

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        } else {
          const { data: regs } = await supabase.from('race_participants').select('*').eq('user_id', authUser.id);
          setAllRegistrations(regs || []);
          const { data: scores } = await supabase.from('scoresheets').select('*');
          setScoresheets(scores || []);
        }

        if (prof?.role === 'superadmin') {
          const { data: logs } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
          setSystemLogs(logs || []);
        }
      } else {
        const { data: prices } = await supabase.from('pricing').select('*').order('order_index', { ascending: true });
        setPricing(prices || []);
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
      if (error) {
        if (error.message.includes('Email not confirmed')) alert('Tento e-mail ještě nebyl ověřen.');
        else alert(error.message);
      }
      else {
        await supabase.from('system_logs').insert([{ user_id: data.user.id, action: 'Přihlášení', details: { email } }]);
        window.location.reload();
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isResettingPassword && user) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) alert(error.message);
      else {
        alert('Heslo bylo úspěšně změněno!');
        setIsResettingPassword(false);
        window.location.hash = ''; 
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) alert(error.message);
      else alert('Odkaz pro obnovu hesla byl odeslán na Váš e-mail.');
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
        alert('Účet byl úspěšně vytvořen! Můžete si heslo zkopírovat: ' + generatedPassword);
        setNewAccountEmail('');
      } else {
        alert('Chyba: ' + data.error);
      }
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
    
    if (error) alert(error.message);
    else { 
      await logSystemAction('Vypsán nový závod', { name: newEventName });
      const tgMsg = `🎉 <b>NOVÉ ZÁVODY VYPSÁNY!</b>\n\n🏆 <b>Název:</b> ${newEventName}\n📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\nPřihlášky jsou otevřeny! 🤠`;
      await sendTelegramMessage(tgMsg);
      alert('Závod vytvořen!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Odemknout přihlášky?' : 'Uzamknout přihlášky?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction(currentLocked ? 'Odemčen závod' : 'Uzamčen závod', { event: eventName });
        window.location.reload();
      }
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    const pin = prompt(`POZOR! Opravdu smazat závod "${eventName}"?\nSmažou se i VŠICHNI jezdci!\n\nNapište: SMAZAT`);
    if (pin === 'SMAZAT') {
      const { data: parts } = await supabase.from('race_participants').select('id').eq('event_id', eventId);
      if (parts && parts.length > 0) {
        const pIds = parts.map(p => p.id);
        await supabase.from('scoresheets').delete().in('participant_id', pIds);
        await supabase.from('race_participants').delete().eq('event_id', eventId);
      }
      await supabase.from('events').delete().eq('id', eventId);
      alert('Závod smazán!');
      window.location.reload();
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    let patternUrl = null;
    if (patternFile) {
      const fileExt = patternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      if (uploadError) { alert('Chyba nahrávání: ' + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('pricing').insert([{ 
      discipline_name: newDiscName, 
      price: parseInt(newDiscPrice), 
      pattern_url: patternUrl,
      order_index: parseInt(newDiscOrder) || 0
    }]);
    if (error) alert(error.message);
    else { 
      alert('Disciplína přidána do ceníku!'); 
      window.location.reload(); 
    }
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditPatternFile(null);
    setEditManeuvers(p.maneuver_names || '');
    setEditDiscOrder(p.order_index || '0');
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu smazat disciplínu ${discName}?`)) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    await logSystemAction('Úprava platby', { rider: riderName, note });
  };
  const sendManualTgMessage = async () => {
    if(!manualTgMessage) return;
    await sendTelegramMessage(`📢 <b>INFORMACE OD POŘADATELE:</b>\n\n${manualTgMessage}`);
    alert('Odesláno na Telegram!');
    setManualTgMessage('');
  };

  const handleEndCompetitionAndSendResults = async (eventId) => {
    if(!confirm("Opravdu chcete slavnostně ukončit závody a odeslat kompletní výsledky?")) return;

    const eventObj = events.find(e => e.id === eventId);
    let tgMsg = `🏆 <b>ZÁVODY UKONČENY - CELKOVÉ VÝSLEDKY</b> 🏆\n\n<b>${eventObj.name}</b>\n\n`;

    const disciplinesInEvent = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];
    const sortedDisciplines = disciplinesInEvent.sort((a, b) => {
      const pA = pricing.find(p => p.discipline_name === a)?.order_index || 0;
      const pB = pricing.find(p => p.discipline_name === b)?.order_index || 0;
      return pA - pB;
    });

    sortedDisciplines.forEach(disc => {
      const ridersInDisc = allRegistrations.filter(r => r.event_id === eventId && r.discipline === disc);
      const scoredRiders = ridersInDisc
        .map(r => {
          const sObj = scoresheets.find(s => s.participant_id === r.id);
          return { ...r, totalScore: sObj ? sObj.total_score : -999, isDq: sObj?.is_dq || false };
        })
        .filter(r => r.totalScore !== -999 || r.isDq)
        .sort((a, b) => {
           if (a.isDq) return 1;
           if (b.isDq) return -1;
           return b.totalScore - a.totalScore;
        }); 

      if(scoredRiders.length > 0) {
        tgMsg += `📍 <b>${disc}</b>\n`;
        scoredRiders.forEach((r, index) => {
          if (r.isDq) {
            tgMsg += `❌ ${r.rider_name} (${r.horse_name}) - <b>DQ</b>\n`;
          } else {
            let medal = '🏅';
            if(index === 0) medal = '🥇';
            if(index === 1) medal = '🥈';
            if(index === 2) medal = '🥉';
            tgMsg += `${medal} ${index + 1}. ${r.rider_name} (${r.horse_name}) - <b>${r.totalScore} b.</b>\n`;
          }
        });
        tgMsg += `\n`;
      }
    });

    tgMsg += `Děkujeme všem jezdcům a gratulujeme vítězům! 🎉 Pokud máte zájem o originální zapsané archy s podpisem, naleznete je v naší skupině.`;

    await sendTelegramMessage(tgMsg);
    alert('Závody byly ukončeny a výsledková listina odeslána!');
  };

  const handleRaceRegistration = async () => {
    if (!profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city) {
      alert("Než se přihlásíte na závod, musíte mít kompletně vyplněný profil! Prosím, upravte si údaje v levém panelu.");
      return;
    }

    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) {
      alert("Vyplňte prosím jméno jezdce, vyberte závod, koně a aspoň jednu disciplínu.");
      return;
    }

    const finalRiderName = customRiderName.trim();

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napište jméno nového koně!");
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName.trim() }])
        .select().single();
      if (horseErr) return alert("Chyba při ukládání koně: " + horseErr.message);
      finalHorseName = newHorse.name;
    }

    const selectedEventObj = events.find(e => e.id === selectedEvent);
    const fromNum = selectedEventObj?.start_num_from || 1;
    const toNum = selectedEventObj?.start_num_to || 200;
    const capacity = toNum - fromNum + 1;

    const { data: freshRegs } = await supabase.from('race_participants')
        .select('start_number, rider_name, horse_name')
        .eq('event_id', selectedEvent);
    
    const existingMatch = freshRegs?.find(r => 
        r.rider_name?.trim().toLowerCase() === finalRiderName.toLowerCase() &&
        r.horse_name?.trim().toLowerCase() === finalHorseName.toLowerCase()
    );

    let assignedNumber;
    if (existingMatch) {
      assignedNumber = existingMatch.start_number; 
    } else {
      const takenNumbers = freshRegs?.map(t => t.start_number) || [];
      const available = Array.from({ length: capacity }, (_, i) => i + fromNum).filter(n => !takenNumbers.includes(n));

      if (available.length === 0) {
        alert("Kapacita čísel pro tento závod je vyčerpána!");
        return;
      }
      assignedNumber = available[Math.floor(Math.random() * available.length)];
    }

    const registrationData = selectedDisciplines.map(d => {
      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: finalRiderName,
        rider_birth_date: riderBirthDate, 
        age_category: riderAgeCategory,
        horse_name: finalHorseName,
        horse_birth_date: horseBirthDate, 
        horse_id_number: horseIdNumber,   
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: null, 
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    });

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      await logSystemAction('Odeslána přihláška na závod', { horse: finalHorseName, rider: finalRiderName });
      alert(`Přihláška odeslána! Startovní číslo: ${assignedNumber}.`);
      setCustomRiderName('');
      setSelectedDisciplines([]);
      window.location.reload();
    }
  };

  const updateParticipantDraw = async (id, newDraw) => {
    const val = newDraw ? parseInt(newDraw) : null;
    const { error } = await supabase.from('race_participants').update({ draw_order: val }).eq('id', id);
    if (error) alert(error.message);
    else checkUser();
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit tuto přihlášku?")) {
      const { error } = await supabase.from('race_participants').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Hráč zrušil přihlášku', { registration_id: id });
        window.location.reload();
      }
    }
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    const currDisc = pricing.find(p => p.discipline_name === discName);
    setJudgeManeuversText(currDisc?.maneuver_names || '');
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
  };

  const handleSaveManeuverNames = async () => {
    if (!judgeDiscipline) return;
    const { error } = await supabase.from('pricing').update({ maneuver_names: judgeManeuversText }).eq('discipline_name', judgeDiscipline);
    if (error) alert(error.message);
    else {
      alert('Názvy manévrů uloženy! Nyní se propíšou do tištěného archu.');
      checkUser();
    }
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLÍNA UZAVŘENA</b>\n\nPrávě bylo dokončeno hodnocení disciplíny <b>${discName}</b>. Kompletní výsledky budou k dispozici po ukončení závodů. Děkujeme jezdcům!`);
        alert('Odesláno!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill('0'));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(''));
      setIsDq(existingScore.is_dq || false);
    } else {
      setManeuverScores(Array(10).fill('0'));
      setPenaltyScores(Array(10).fill(''));
      setIsDq(false);
    }
  };

  const handleManeuverChange = (index, value) => {
    const newScores = [...maneuverScores];
    newScores[index] = value;
    setManeuverScores(newScores);
  };

  const handlePenaltyChange = (index, value) => {
    const newPenalties = [...penaltyScores];
    newPenalties[index] = value;
    setPenaltyScores(newPenalties);
  };

  const calculateTotalScore = () => {
    if (isDq) return 0;
    const baseScore = 70;
    const maneuversTotal = maneuverScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    
    const timestamp = new Date().toISOString();
    const jName = actualJudgeName || 'Neznámý rozhodčí';
    
    const dataToSign = `${evaluatingParticipant.id}-${jName}-${timestamp}-${total}-${isDq}-${JSON.stringify(scoreData)}`;
    const hash = await generateHash(dataToSign);

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      judge_name: jName,
      scored_at: timestamp,
      signature_hash: hash,
      score_data: scoreData,
      total_score: total,
      is_dq: isDq 
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      await logSystemAction('Uloženo hodnocení vč. digitálního podpisu', { rider: evaluatingParticipant.rider_name, total, isDq, hash });
      alert('Hodnocení uloženo!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableStartlist = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;
    
    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];
    const sortedDisciplines = disciplines.sort((a, b) => {
      const pA = pricing.find(p => p.discipline_name === a)?.order_index || 0;
      const pB = pricing.find(p => p.discipline_name === b)?.order_index || 0;
      return pA - pB;
    });

    return (
      <div className="print-area">
        <h2 className="print-only" style={{display: 'none', textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px', fontSize: '1.8rem'}}>Startovní listina: {eventObj.name}</h2>
        {sortedDisciplines.length === 0 ? <p className="no-print">Žádní jezdci k tisku.</p> : sortedDisciplines.map(disc => {
          const riders = allRegistrations.filter(r => r.event_id === eventId && r.discipline === disc).sort((a,b) => a.start_number - b.start_number);
          if(riders.length === 0) return null;
          return (
            <div key={disc} style={{marginBottom: '30px', pageBreakInside: 'avoid'}}>
              <h3 style={{borderBottom: '2px solid black', paddingBottom: '5px', backgroundColor: '#f5f5f5', padding: '8px', margin: '0 0 10px 0'}}>{disc}</h3>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem'}}>
                <thead>
                  <tr style={{borderBottom: '2px solid black', textAlign: 'left'}}>
                    <th style={{padding: '8px', width: '15%'}}>DRAW</th>
                    <th style={{padding: '8px', width: '15%'}}>Záda (EXH)</th>
                    <th style={{padding: '8px', width: '35%'}}>Jezdec</th>
                    <th style={{padding: '8px'}}>Kůň</th>
                    <th className="no-print" style={{padding: '8px'}}>Platba</th>
                  </tr>
                </thead>
                <tbody>
                  {riders.map(r => (
                    <tr key={r.id} style={{borderBottom: '1px solid #ccc'}}>
                      <td style={{padding: '8px'}}>
                        <input 
                          type="number" 
                          className="no-print"
                          defaultValue={r.draw_order || ''} 
                          onBlur={(e) => updateParticipantDraw(r.id, e.target.value)}
                          style={{width: '60px', padding: '5px', textAlign: 'center', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px'}}
                        />
                        <span className="print-only" style={{display: 'none'}}>{r.draw_order || ''}</span>
                      </td>
                      <td style={{padding: '8px', fontWeight: 'bold', fontSize: '1.3rem'}}>{r.start_number}</td>
                      <td style={{padding: '8px'}}>{r.rider_name}</td>
                      <td style={{padding: '8px'}}>{r.horse_name}</td>
                      <td className="no-print" style={{padding: '8px'}}>
                        <input type="text" defaultValue={r.payment_note || ''} onBlur={(e) => updatePaymentNote(r.id, e.target.value, r.rider_name)} placeholder="Např. Hotově" style={{padding: '5px', width: '100px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    );
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];
    const sortedDisciplines = disciplines.sort((a, b) => {
      const pA = pricing.find(p => p.discipline_name === a)?.order_index || 0;
      const pB = pricing.find(p => p.discipline_name === b)?.order_index || 0;
      return pA - pB;
    });

    return (
      <div className="print-area">
        {sortedDisciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádní jezdci.</p>
        ) : (
          sortedDisciplines.map(discipline => {
            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => a.start_number - b.start_number);
            if(ridersInDiscipline.length === 0) return null;

            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            
            const maneuverNamesArr = pricing.find(p => p.discipline_name === discipline)?.maneuver_names?.split(',') || [];

            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.5rem' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: '#444' }}>SCORESHEET: {discipline}</h3>
                </div>
                
                <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center' }}>Umístění (DRAW)</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center' }}>Záda (EXH#)</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'left', minWidth: '150px' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '4px', width: '40px', fontSize: '0.7rem' }}></th>
                      <th colSpan="10" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', background: '#f5f5f5' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '70px', textAlign: 'center' }}>PENALTY<br/>TOTAL</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '80px', textAlign: 'center', fontSize: '1.1rem' }}>FINAL<br/>SCORE</th>
                    </tr>
                    <tr>
                      {[1,2,3,4,5,6,7,8,9,10].map(m => {
                        const mName = maneuverNamesArr[m-1]?.trim();
                        return (
                          <th key={m} style={{ border: '2px solid black', padding: '6px', width: '40px', textAlign: 'center', background: '#f5f5f5', fontSize: mName ? '0.7rem' : '1rem' }}>
                            {mName || m}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const pTotal = scoreObj && scoreObj.score_data ? scoreObj.score_data.penalties.reduce((a,b)=>a+(parseFloat(b)||0),0) : '';
                      const isDqScore = scoreObj && scoreObj.is_dq;
                      
                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{r.draw_order || ''}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', borderRight: '1px solid black' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{r.rider_name}</div>
                              <div style={{ color: '#444', fontStyle: 'italic' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>PENALTY</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => (
                              <td key={`p-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', color: 'red', fontWeight: 'bold', height: '25px' }}>
                                {scoreObj && scoreObj.score_data && parseFloat(scoreObj.score_data.penalties[i]) > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                              </td>
                            ))}
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.3rem', color: isDqScore ? 'red' : 'black' }}>
                              {isDqScore ? 'DQ' : (scoreObj ? scoreObj.total_score : '')}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>SCORE</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => {
                               const val = scoreObj && scoreObj.score_data ? parseFloat(scoreObj.score_data.maneuvers[i]) : 0;
                               return (
                                <td key={`s-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', height: '25px' }}>
                                  {scoreObj && val !== 0 ? (val > 0 ? `+${val}` : val) : (scoreObj ? '0' : '')}
                                </td>
                               );
                            })}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '3px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555' }}>Rozhodčí / Judge's signature:</p>
                    <h3 style={{ margin: '0 0 5px 0' }}>{signatureObj ? signatureObj.judge_name : '_______________________'}</h3>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>Dne: {signatureObj ? new Date(signatureObj.scored_at).toLocaleString('cs-CZ') : '___________________'}</p>
                  </div>
                  
                  {scoredRiders.length > 0 && (
                    <div style={{ flex: 1, textAlign: 'right', background: '#f5f5f5', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>KRYPTOGRAFICKÉ OTISKY (SHA-256)</p>
                      <ul style={{ margin: '0', padding: '0', listStyleType: 'none', fontSize: '0.65rem', color: '#666', textAlign: 'left', display: 'inline-block' }}>
                        {scoredRiders.map(r => {
                          const sObj = scoresheets.find(s => s.participant_id === r.id);
                          return (
                            <li key={r.id} style={{marginBottom: '3px'}}>
                              <strong>Záda {r.start_number}:</strong> {sObj.signature_hash.substring(0, 20)}...
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
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
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].sort((a,b) => {
      const pA = pricing.find(p => p.discipline_name === a)?.order_index || 0;
      const pB = pricing.find(p => p.discipline_name === b)?.order_index || 0;
      return pA - pB;
  }) : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => a.start_number - b.start_number) : [];

  const lockedEvent = events.find(ev => ev.is_locked);
  const speakerEventId = lockedEvent?.id;
  const speakerDiscipline = lockedEvent?.active_discipline;
  const speakerStartList = speakerEventId && speakerDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerDiscipline).sort((a, b) => a.start_number - b.start_number) : [];

  if (currentTab === 'rules' && user) {
    return (
      <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Zpět do Aplikace</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: '#ffb300', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
        
        <div className="no-print" style={styles.card}>
          <h2 style={{color: '#5d4037', textAlign: 'center', marginTop: 0}}>WESTERNOVÉ HOBBY ZÁVODY POD HUMPRECHTEM</h2>
          <div style={{whiteSpace: 'pre-wrap', fontSize: '1.1rem', marginTop: '20px', lineHeight: '1.6'}}>
            {events.find(e => e.id === adminSelectedEvent)?.event_propositions || "Propozice nebyly zatím nahrány."}
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
          .footer-branding { position: fixed !important; bottom: 0 !important; }
          .main-grid-print-fix { display: block !important; gap: 0 !important; }
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
          <button onClick={() => setSimulatedRole('admin')} style={effectiveRole === 'admin' ? styles.activeTab : styles.tab}>Admin</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Zapisovatel (Scribe)</button>
          )}
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('speaker')} style={effectiveRole === 'speaker' ? styles.activeTab : styles.tab}>Spíkr</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={effectiveRole === 'player' ? styles.activeTab : styles.tab}>Hráč</button>
        </div>
      )}

      <div className="no-print" style={styles.brandHeader}>
        <img src="/brand.jpg" alt="Logo" style={styles.logo} onError={(e) => e.target.style.display='none'} />
        <h1 style={styles.title}>Westernové hobby závody</h1>
        <p style={styles.subtitle}>POD HUMPRECHTEM</p>
      </div>

      {!user ? (
        <div className="no-print" style={styles.card}>
          <h2 style={{textAlign: 'center', color: '#5d4037', marginBottom: '15px'}}>
            {isResettingPassword ? 'Obnova hesla' : (isSignUp ? 'Nová registrace' : 'Přihlášení')}
          </h2>
          <form onSubmit={isResettingPassword ? handleResetPassword : handleAuth} style={styles.form}>
            {!isResettingPassword && <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />}
            <input type="password" placeholder={isResettingPassword ? "Zadejte nové heslo" : "Heslo"} value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnPrimary}>{isResettingPassword ? 'ULOŽIT NOVÉ HESLO' : (isSignUp ? 'ZAREGISTROVAT SE' : 'VSTOUPIT')}</button>
          </form>
          {!isResettingPassword && (
            <button onClick={() => setIsSignUp(!isSignUp)} style={styles.btnText}>
              {isSignUp ? 'Už máte účet? Přihlaste se zde.' : 'Nemáte účet? Zaregistrujte se zde.'}
            </button>
          )}
          {!isSignUp && (
            <button onClick={() => setIsResettingPassword(!isResettingPassword)} style={{...styles.btnText, marginTop: '5px', fontSize: '0.8rem'}}>
              {isResettingPassword ? 'Zpět na přihlášení' : 'Zapomněli jste heslo? Klikněte zde.'}
            </button>
          )}
        </div>
      ) : (
        <div className="main-grid-print-fix" style={styles.mainGrid}>
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
                      <button onClick={() => setAdminSelectedEvent('accounts')} style={adminSelectedEvent === 'accounts' ? {...styles.activeTab, background: '#e65100'} : {...styles.tab, background: '#e65100'}}>Vytvořit Účet</button>
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
                                <button onClick={() => handleDeleteEvent(ev.id, ev.name)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', marginLeft: '15px'}}>
                                  Smazat
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Ceník a Řazení disciplín</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '80px'}} required/>
                        <input type="number" placeholder="Pořadí" value={newDiscOrder} onChange={e => setNewDiscOrder(e.target.value)} style={{...styles.inputSmall, width: '70px'}} title="Pořadí (1, 2, 3...)" required/>
                        <button type="submit" style={styles.btnSave}>Přidat</button>
                      </form>

                      <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                        <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                          <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                            <tr style={{textAlign: 'left'}}>
                              <th style={{padding: '10px', width: '60px'}}>Pořadí</th>
                              <th style={{padding: '10px'}}>Disciplína</th>
                              <th style={{padding: '10px', width: '80px'}}>Cena</th>
                              <th style={{padding: '10px'}}>Manévry</th>
                              <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map(p => (
                              <tr key={p.id} style={{borderBottom: '1px solid #eee', background: editingPricingId === p.id ? '#fff9c4' : 'transparent'}}>
                                {editingPricingId === p.id ? (
                                  <>
                                    <td style={{padding: '10px'}}>
                                      <input type="number" value={editDiscOrder} onChange={e => setEditDiscOrder(e.target.value)} style={{...styles.inputSmall, width: '50px'}} />
                                    </td>
                                    <td style={{padding: '10px'}}>{p.discipline_name}</td>
                                    <td style={{padding: '10px'}}>
                                      <input type="number" value={editDiscPrice} onChange={e => setEditDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '60px'}} />
                                    </td>
                                    <td style={{padding: '10px'}}>
                                      <input type="text" placeholder="Krok, Klus..." value={editManeuvers} onChange={e => setEditManeuvers(e.target.value)} style={styles.inputSmall} />
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={async () => {
                                        await supabase.from('pricing').update({ price: parseInt(editDiscPrice), maneuver_names: editManeuvers, order_index: parseInt(editDiscOrder) }).eq('id', p.id);
                                        setEditingPricingId(null);
                                        window.location.reload();
                                      }} style={{...styles.btnSave, padding: '5px 10px', marginRight: '5px'}}>Uložit</button>
                                      <button onClick={() => setEditingPricingId(null)} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{p.order_index}</td>
                                    <td style={{padding: '10px'}}>{p.discipline_name}</td>
                                    <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                                    <td style={{padding: '10px'}}>{p.maneuver_names || <span style={{color:'#aaa'}}>---</span>}</td>
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
                  <div className="no-print" style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #e65100', margin: '20px 0'}}>
                    <h3 style={{color: '#e65100', marginTop: 0}}>Nové uživatelské přístupy</h3>
                    <form onSubmit={handleCreateAccount} style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                      <input type="email" placeholder="E-mailová adresa" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)} style={styles.inputSmall} required/>
                      <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={styles.inputSmall}>
                        <option value="judge">Zapisovatel (Scribe)</option>
                        <option value="speaker">Hlasatel (Speaker)</option>
                        <option value="admin">Administrátor</option>
                      </select>
                      <button type="submit" style={{...styles.btnSave, background: '#e65100'}}>Vygenerovat heslo</button>
                    </form>
                  </div>
                )}

                {adminSelectedEvent === 'telegram' && (
                  <div className="no-print" style={{background: '#e3f2fd', padding: '20px', borderRadius: '8px', border: '2px solid #0288d1', textAlign: 'center'}}>
                    <h3 style={{color: '#0288d1', marginTop: 0}}>📢 Manuální odeslání zprávy do kanálu</h3>
                    <input type="text" placeholder="Napište vzkaz pro jezdce..." value={manualTgMessage} onChange={e => setManualTgMessage(e.target.value)} style={{...styles.input, fontSize: '1.1rem', padding: '15px'}} />
                    <button onClick={sendManualTgMessage} style={{...styles.btnSave, background: '#0288d1', padding: '15px 30px', fontSize: '1.1rem', marginTop: '10px'}}>Odeslat Zprávu Nyní</button>
                  </div>
                )}

                {adminSelectedEvent && adminSelectedEvent !== 'telegram' && adminSelectedEvent !== 'accounts' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                      <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc'}}>
                        <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán závodů:</strong>
                        <textarea id="schedule-textarea" rows="5" style={{...styles.input, resize: 'vertical'}} defaultValue={events.find(e => e.id === adminSelectedEvent)?.schedule || ''} />
                        <button onClick={async () => {
                          const val = document.getElementById('schedule-textarea').value;
                          await supabase.from('events').update({ schedule: val }).eq('id', adminSelectedEvent);
                          if (val.trim() !== '') await sendTelegramMessage(`📅 <b>AKTUÁLNÍ PLÁN ZÁVODŮ:</b>\n\n${val}`);
                          alert('Plán uložen a odeslán!');
                        }} style={{...styles.btnSave, background: '#0288d1', marginTop: '10px'}}>Uložit a odeslat</button>
                      </div>
                      <div style={{background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #4caf50'}}>
                        <strong style={{color: '#2e7d32', display: 'block', marginBottom: '5px'}}>📜 Propozice a Pravidla:</strong>
                        <textarea rows="5" style={{...styles.input, resize: 'vertical', border: '1px solid #4caf50'}} defaultValue={events.find(e => e.id === adminSelectedEvent)?.event_propositions || ''} onBlur={async (e) => { await supabase.from('events').update({ event_propositions: e.target.value }).eq('id', adminSelectedEvent); alert('Propozice uloženy!'); }} />
                      </div>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz pro Spíkra:</strong>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === adminSelectedEvent)?.speaker_message || 'Žádná zpráva'}</span>
                      </div>
                      <button onClick={() => handleUpdateSpeakerMessage(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                    </div>

                    <div className="no-print" style={{marginBottom: '20px', background: '#fff9c4', padding: '20px', borderRadius: '8px', border: '2px solid #fbc02d', textAlign: 'center'}}>
                      <h3 style={{margin: '0 0 10px 0', color: '#f57f17'}}>Konec závodů</h3>
                      <button onClick={() => handleEndCompetitionAndSendResults(adminSelectedEvent)} style={{...styles.btnSave, background: '#fbc02d', color: '#000', fontSize: '1.2rem', padding: '15px 30px'}}>🏆 Ukončit závody a vyhlásit výsledky na Telegram</button>
                    </div>

                    <div className="no-print" style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0', color: '#0288d1'}}>Offline Registrace na místě</h4>
                      
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee'}}>
                        <div>
                          <strong style={{fontSize: '0.85rem', color: '#555'}}>Údaje jezdce:</strong>
                          <input type="text" placeholder="Jméno jezdce" value={offlineRiderName} onChange={e=>setOfflineRiderName(e.target.value)} style={styles.inputSmall}/>
                          <input type="date" placeholder="Datum narození jezdce" value={offlineRiderBirthDate} onChange={e=>setOfflineRiderBirthDate(e.target.value)} style={styles.inputSmall} title="Datum narození jezdce" />
                          <select value={offlineAgeCategory} onChange={e=>setOfflineAgeCategory(e.target.value)} style={styles.inputSmall}>
                            <option value="18+">Dospělý (18+)</option>
                            <option value="<18">Začátečník/Dítě</option>
                          </select>
                        </div>
                        <div>
                          <strong style={{fontSize: '0.85rem', color: '#555'}}>Údaje koně:</strong>
                          <input type="text" placeholder="Jméno koně" value={offlineHorseName} onChange={e=>setOfflineHorseName(e.target.value)} style={styles.inputSmall}/>
                          <input type="date" placeholder="Datum narození koně" value={offlineHorseBirthDate} onChange={e=>setOfflineHorseBirthDate(e.target.value)} style={styles.inputSmall} title="Datum narození koně"/>
                          <input type="text" placeholder="ID koně (z průkazu)" value={offlineHorseIdNumber} onChange={e=>setOfflineHorseIdNumber(e.target.value)} style={styles.inputSmall}/>
                        </div>
                      </div>

                      <div style={{marginTop: '15px'}}>
                         <strong style={{fontSize: '0.85rem'}}>Vyberte disciplíny:</strong>
                         <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px'}}>
                           {pricing.map(d => (
                             <label key={d.id} style={{fontSize: '0.85rem', cursor: 'pointer', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#eee', padding: '5px 10px', borderRadius: '4px'}}>
                               <input type="checkbox" checked={!!selectedDisciplines.find(x => x.id === d.id)} onChange={() => {
                                 const exists = selectedDisciplines.find(x => x.id === d.id);
                                 setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                               }} style={{display: 'none'}} />
                               {d.discipline_name}
                             </label>
                           ))}
                         </div>
                      </div>
                      <button onClick={async () => {
                        if (!offlineRiderName.trim() || !offlineHorseName.trim() || selectedDisciplines.length === 0) return alert("Vyplňte základní údaje a disciplíny.");
                        const eventObj = events.find(e => e.id === adminSelectedEvent);
                        const capacity = (eventObj?.start_num_to || 200) - (eventObj?.start_num_from || 1) + 1;
                        
                        const { data: freshRegs } = await supabase.from('race_participants').select('start_number, rider_name, horse_name').eq('event_id', adminSelectedEvent);
                        const existingMatch = freshRegs?.find(r => r.rider_name?.trim().toLowerCase() === offlineRiderName.trim().toLowerCase() && r.horse_name?.trim().toLowerCase() === offlineHorseName.trim().toLowerCase());

                        let assignedNumber;
                        if (existingMatch) assignedNumber = existingMatch.start_number; 
                        else {
                          const takenNumbers = freshRegs?.map(t => t.start_number) || [];
                          const fromNum = eventObj?.start_num_from || 1;
                          const available = Array.from({ length: capacity }, (_, i) => i + fromNum).filter(n => !takenNumbers.includes(n));
                          if (available.length === 0) return alert("Kapacita čísel vyčerpána!");
                          assignedNumber = available[Math.floor(Math.random() * available.length)];
                        }

                        const regData = selectedDisciplines.map(d => ({
                          user_id: user.id, event_id: adminSelectedEvent, 
                          rider_name: offlineRiderName.trim(), age_category: offlineAgeCategory, rider_birth_date: offlineRiderBirthDate,
                          horse_name: offlineHorseName.trim(), horse_birth_date: offlineHorseBirthDate, horse_id_number: offlineHorseIdNumber,
                          discipline: d.discipline_name, start_number: assignedNumber, draw_order: null, price: d.price, is_paid: true, payment_note: 'Hotově na místě'
                        }));
                        
                        const { error } = await supabase.from('race_participants').insert(regData);
                        if(error) alert(error.message); else { alert("Hotovo!"); setOfflineRiderName(''); setOfflineHorseName(''); setOfflineRiderBirthDate(''); setOfflineHorseBirthDate(''); setOfflineHorseIdNumber(''); setSelectedDisciplines([]); window.location.reload(); }
                      }} style={{...styles.btnSave, background: '#0288d1', marginTop: '15px'}}>Registrovat a Zaplatit</button>
                    </div>

                    <div className={printMode === 'startlist' ? 'print-area' : 'no-print'} style={{...styles.adminSection, border: printMode ? 'none' : '1px solid #ddd'}}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Startovní listina k tisku</h4>
                        <button onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                      </div>
                      {renderPrintableStartlist(adminSelectedEvent)}
                    </div>

                    <div className={printMode === 'scoresheets' ? 'print-area' : 'no-print'} style={{...styles.adminSection, border: printMode ? 'none' : '1px solid #ddd'}}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Scoresheety</button>
                      </div>
                      {renderPrintableScoresheets(adminSelectedEvent)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {effectiveRole === 'judge' && (
              <div className={printMode ? 'print-area' : ''}>
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd'}}>Panel Zapisovatele (Scribe)</h3>
                </div>

                <div className="no-print" style={{background: '#e1f5fe', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #0288d1'}}>
                  <label style={{fontWeight: 'bold', color: '#0277bd'}}>Jméno hlavního rozhodčího:</label>
                  <input type="text" placeholder="Např. Pavla Doubravová" value={actualJudgeName} onChange={e => setActualJudgeName(e.target.value)} style={{...styles.input, border: '2px solid #0288d1'}} />
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz pro Spíkra:</strong>
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === judgeEvent)?.speaker_message || 'Žádná zpráva'}</span>
                    </div>
                    <button onClick={() => handleUpdateSpeakerMessage(judgeEvent, events.find(e => e.id === judgeEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000'}}>Upravit</button>
                  </div>
                )}
                
                <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                  {evaluatingParticipant ? (
                    <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      
                      <div style={{flex: 2, minWidth: '300px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '15px'}}>
                          <h2 style={{marginTop: 0, color: '#0277bd'}}>{evaluatingParticipant.discipline}</h2>
                          <h2 style={{marginTop: 0}}>Záda (EXH#): {evaluatingParticipant.start_number}</h2>
                        </div>
                        <p style={{fontSize: '1.3rem', marginBottom: '20px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>

                        <div style={{marginBottom: '20px', background: '#ffebee', padding: '15px', border: '2px solid #d32f2f', borderRadius: '8px'}}>
                          <label style={{color: '#d32f2f', fontWeight: 'bold', fontSize: '1.3rem', display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                            <input type="checkbox" checked={isDq} onChange={(e) => setIsDq(e.target.checked)} style={{transform: 'scale(1.8)', marginRight: '15px', cursor: 'pointer'}}/>
                            DISKVALIFIKACE (DQ)
                          </label>
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', opacity: isDq ? 0.4 : 1, pointerEvents: isDq ? 'none' : 'auto'}}>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry</h4>
                            {maneuverScores.map((score, index) => {
                              const maneuverNamesArr = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline)?.maneuver_names?.split(',') || [];
                              const maneuverName = maneuverNamesArr[index]?.trim() || `Manévr ${index + 1}`;
                              const isShowmanship = evaluatingParticipant.discipline.toLowerCase().includes('showmanship') || evaluatingParticipant.discipline.toLowerCase().includes('horsemanship');
                              return (
                                <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                  <strong>{maneuverName}</strong>
                                  <select value={score} onChange={(e) => handleManeuverChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold'}}>
                                    {isShowmanship ? (
                                      <><option value="3">+3</option><option value="2">+2</option><option value="1">+1</option><option value="0">0</option><option value="-1">-1</option><option value="-2">-2</option><option value="-3">-3</option></>
                                    ) : (
                                      <><option value="1.5">+1.5</option><option value="1.0">+1.0</option><option value="0.5">+0.5</option><option value="0">0</option><option value="-0.5">-0.5</option><option value="-1.0">-1.0</option><option value="-1.5">-1.5</option></>
                                    )}
                                  </select>
                                </div>
                              )
                            })}
                          </div>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace</h4>
                            {penaltyScores.map((penalty, index) => {
                               const maneuverNamesArr = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline)?.maneuver_names?.split(',') || [];
                               const maneuverName = maneuverNamesArr[index]?.trim() || `Manévr ${index + 1}`;
                               return (
                                <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                  <strong>U: {maneuverName}</strong>
                                  <input type="number" min="0" step="0.5" value={penalty} onChange={(e) => handlePenaltyChange(index, e.target.value)} placeholder="0" style={{padding: '5px', width: '60px', textAlign: 'center', fontWeight: 'bold', color: 'red'}} />
                                </div>
                               )
                            })}
                          </div>
                        </div>

                        <div style={{marginTop: '30px', padding: '15px', background: isDq ? '#ffebee' : '#e1f5fe', borderRadius: '8px', textAlign: 'right', border: '2px solid black'}}>
                          <strong style={{fontSize: '1.5rem', color: isDq ? 'red' : '#000'}}>CELKOVÉ SKÓRE: {isDq ? 'DQ' : calculateTotalScore()}</strong>
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                          <button onClick={saveScore} style={{...styles.btnSave, background: isDq ? '#d32f2f' : '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Uložit hodnocení</button>
                          <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 1, marginTop: 0}}>Zpět na listinu</button>
                        </div>
                      </div>

                      <div className="no-print" style={{flex: 1, minWidth: '250px', background: '#fff9c4', padding: '15px', borderRadius: '8px', border: '1px solid #fbc02d'}}>
                        <h4 style={{marginTop: 0, color: '#f57f17', borderBottom: '1px solid #fbc02d', paddingBottom: '5px'}}>Tahák (Pravidla)</h4>
                        <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: '#333'}}>
                          {getRulesForDiscipline(evaluatingParticipant.discipline).map((rule, idx) => (
                            <li key={idx} style={{marginBottom: '8px'}}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={styles.label}>Vyberte uzamčený závod k hodnocení:</label>
                      <select style={styles.input} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                        <option value="">-- Zvolte závod --</option>
                        {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>

                      {judgeEvent && (
                        <div>
                          <label style={styles.label}>Vyberte disciplínu (Zrcadlí se Spíkrovi):</label>
                          <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                            <option value="">-- Zvolte disciplínu --</option>
                            {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}

                      {judgeEvent && judgeDiscipline && (
                        <div style={{marginTop: '20px'}}>
                          <div className="no-print" style={{background: '#f1f8e9', padding: '15px', borderRadius: '8px', border: '1px solid #4caf50', marginBottom: '20px'}}>
                            <strong style={{color: '#2e7d32', display: 'block', marginBottom: '5px'}}>Názvy manévrů:</strong>
                            <div style={{display: 'flex', gap: '10px'}}>
                              <input type="text" value={judgeManeuversText} onChange={e => setJudgeManeuversText(e.target.value)} placeholder="Zadejte manévry..." style={{...styles.input, margin: 0}} />
                              <button onClick={handleSaveManeuverNames} style={{...styles.btnSave, background: '#4caf50', margin: 0}}>Uložit</button>
                            </div>
                          </div>

                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 style={{margin: 0}}>Startovní pořadí: {judgeDiscipline}</h4>
                            <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0}}>📣 Oznámit konec disciplíny</button>
                          </div>
                          <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                              <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                                <th style={{padding: '10px'}}>Záda</th><th style={{padding: '10px'}}>Jezdec</th><th style={{padding: '10px'}}>Kůň</th><th style={{padding: '10px', textAlign: 'center'}}>Stav</th>
                              </tr>
                            </thead>
                            <tbody>
                              {judgeStartList.length > 0 ? judgeStartList.map(r => {
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                const isScored = !!scoreObj;
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '10px', fontWeight: 'bold', fontSize: '1.2rem'}}>{r.start_number}</td>
                                    <td style={{padding: '10px'}}>{r.rider_name}</td>
                                    <td style={{padding: '10px'}}>{r.horse_name}</td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      {isScored ? (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '5px 10px', border: '1px solid #4caf50', color: scoreObj.is_dq ? 'red' : '#4caf50'}}>Opravit ({scoreObj.is_dq ? 'DQ' : scoreObj.total_score})</button>
                                      ) : (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd'}}>Zapsat</button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }) : <tr><td colSpan="4" style={{padding: '15px', textAlign: 'center'}}>Žádní jezdci.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {effectiveRole === 'speaker' && (
              <div className="no-print">
                <h3 style={{marginTop: 0, color: '#5d4037', borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Pohled Hlasatele</h3>
                {speakerEventId && speakerDiscipline ? (
                  <div>
                    <h2 style={{fontSize: '2rem', textAlign: 'center', color: '#5d4037'}}>ARÉNA: {speakerDiscipline}</h2>
                    <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                      <thead>
                        <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                          <th style={{padding: '15px'}}>Záda</th><th style={{padding: '15px'}}>Jezdec</th><th style={{padding: '15px'}}>Kůň</th><th style={{padding: '15px', textAlign: 'right'}}>Skóre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {speakerStartList.map(r => {
                          const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                          const isScored = !!scoreObj;
                          const isDq = scoreObj?.is_dq;
                          return (
                            <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.5rem', background: isScored ? (isDq ? '#ffebee' : '#f1f8e9') : '#fff'}}>
                              <td style={{padding: '15px', fontWeight: '900', fontSize: '1.8rem'}}>{r.start_number}</td>
                              <td style={{padding: '15px'}}>{r.rider_name}</td>
                              <td style={{padding: '15px'}}><strong>{r.horse_name}</strong></td>
                              <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: isScored ? (isDq ? 'red' : '#2e7d32') : '#ccc'}}>
                                {isScored ? (isDq ? 'DQ' : `${scoreObj.total_score} b.`) : 'Na trati'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{textAlign: 'center', padding: '20px'}}>Čeká se na rozhodčího...</p>}
              </div>
            )}

            {effectiveRole === 'player' && (
              <div className="no-print">
                <div style={{display: 'flex', gap: '10px', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Závody a Přihlášky</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Komunikační Kanál</button>
                </div>

                {playerTab === 'telegram' && (
                  <div style={{background: '#e3f2fd', padding: '30px', borderRadius: '8px', textAlign: 'center'}}>
                    <h2 style={{color: '#0288d1', marginTop: 0}}>📱 Sledujte hlášení a výsledky!</h2>
                    <a href="https://t.me/+xZ7MOtlAaX05YzA0" target="_blank" rel="noopener noreferrer" style={{...styles.btnSave, background: '#0288d1', textDecoration: 'none', display: 'inline-block', fontSize: '1.2rem', padding: '15px 30px'}}>Přidat se do skupiny</a>
                  </div>
                )}

                {playerTab === 'main' && (
                  <div>
                    <h3 style={{marginTop: 0}}>Nová přihláška k závodu</h3>
                    
                    <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #0288d1', marginBottom: '15px'}}>
                      <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Údaje jezdce:</label>
                      <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={{...styles.input, border: '2px solid #0288d1'}} placeholder="Jméno a příjmení jezdce" />
                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                        <div style={{flex: 1}}>
                          <span style={{fontSize: '0.8rem', color: '#0288d1'}}>Datum narození jezdce:</span>
                          <input type="date" value={riderBirthDate} onChange={e => setRiderBirthDate(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: 0}} />
                        </div>
                        <div style={{flex: 1}}>
                          <span style={{fontSize: '0.8rem', color: '#0288d1'}}>Věková kategorie:</span>
                          <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: 0}}>
                            <option value="18+">Dospělý (18+)</option>
                            <option value="<18">Začátečník/Dítě</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <label style={styles.label}>Vyberte závod:</label>
                    <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                      <option value="">-- Který závod pojedete? --</option>
                      {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                    </select>

                    <label style={styles.label}>Údaje koně:</label>
                    <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                      <option value="">-- Vyberte koně z historie --</option>
                      {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="new">+ Přidat nového koně</option>
                    </select>
                    {selectedHorse === 'new' && (
                      <div style={{background: '#efebe9', padding: '15px', borderRadius: '8px', border: '1px solid #8d6e63', marginTop: '10px'}}>
                        <input type="text" placeholder="Napište jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, border: '1px solid #8d6e63'}} />
                        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                          <div style={{flex: 1}}>
                            <span style={{fontSize: '0.8rem', color: '#5d4037'}}>Datum narození koně:</span>
                            <input type="date" value={horseBirthDate} onChange={e => setHorseBirthDate(e.target.value)} style={{...styles.input, margin: 0}} />
                          </div>
                          <div style={{flex: 1}}>
                            <span style={{fontSize: '0.8rem', color: '#5d4037'}}>ID koně (z průkazu):</span>
                            <input type="text" placeholder="Např. 203011..." value={horseIdNumber} onChange={e => setHorseIdNumber(e.target.value)} style={{...styles.input, margin: 0}} />
                          </div>
                        </div>
                      </div>
                    )}

                    <label style={styles.label}>Disciplíny:</label>
                    <div style={styles.disciplineList}>
                      {pricing.map(d => (
                        <div key={d.id} style={{display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eee', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                          <div onClick={() => {
                            const exists = selectedDisciplines.find(x => x.id === d.id);
                            setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                          }} style={{...styles.disciplineItem, borderBottom: 'none'}}>
                            <span>{d.discipline_name}</span>
                            <strong>{d.price} Kč</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={styles.priceTag}>Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč</div>
                    <button onClick={handleRaceRegistration} style={styles.btnSecondary}>ODESLAT PŘIHLÁŠKU</button>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Moje přihlášky</h3>
                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                            <thead>
                              <tr style={{background: '#eee', textAlign: 'left'}}>
                                <th style={{padding: '8px'}}>Závod</th><th style={{padding: '8px'}}>Jezdec</th><th style={{padding: '8px'}}>Kůň</th><th style={{padding: '8px'}}>Disciplína</th><th style={{padding: '8px'}}>Záda</th><th style={{padding: '8px'}}>Skóre</th><th style={{padding: '8px'}}>Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                                const eventObj = events.find(e => e.id === r.event_id);
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                const isDq = scoreObj?.is_dq;
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px'}}>{eventObj?.name}</td>
                                    <td style={{padding: '8px', fontWeight: 'bold'}}>{r.rider_name}</td>
                                    <td style={{padding: '8px'}}>{r.horse_name}</td>
                                    <td style={{padding: '8px'}}>{r.discipline}</td>
                                    <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                    <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? (isDq ? 'red' : '#2e7d32') : '#888'}}>
                                      {scoreObj ? (isDq ? 'DQ' : scoreObj.total_score) : 'Čeká se'}
                                    </td>
                                    <td style={{padding: '8px'}}>
                                      {!eventObj?.is_locked ? <button onClick={() => handleCancelRegistration(r.id)} style={{color: '#e57373', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer'}}>Zrušit</button> : <span style={{color: '#888'}}>Uzamčeno</span>}
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
  disciplineList: { maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
