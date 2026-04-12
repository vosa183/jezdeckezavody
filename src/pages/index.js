/* eslint-disable */
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

// ZVUKOVÉ UPOZORNĚNÍ PRO ŽLUTOU VYSÍLAČKU (ŠTÁB)
const playAlert = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  } catch (e) {
    console.log("Audio alert blocked by browser");
  }
};

const sendTelegramMessage = async (text) => {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
  } catch (err) {
    console.error('Chyba při odesílání na Telegram:', err);
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
    "Penalta 3: Cval na špatnou nohu, tah za otěže, přerušení ve cvalu, krok/klus > 2 kroky, křižování > 2 kroky.",
    "Penalta 5: Zjevná neposlušnost (kopání, kousání, vyhazování).",
    "DQ: Kulhavost, nepovolená úprava koně, úmyslné týrání."
  ],
  trail: [
    "Penalta 1/2: Lehký dotek překážky (tiknutí).",
    "Penalta 1: Úder do překážky, krok mimo překážku.",
    "Penalta 3: Špatný chod, pád překážky, krok mimo 2 a více nohama.",
    "Penalta 5: Odmítnutí překážky, puštění branky.",
    "DQ: Pád koně nebo jezdce, třetí odmítnutí."
  ],
  reining: [
    "Penalta 1/2: Zpožděná změna o 1 skok, nedotočení spinu.",
    "Penalta 1: Změna cvalu zpožděná o více než 1 skok.",
    "Penalta 2: Zmrznutí ve spinu, klus přes marker.",
    "Penalta 5: Spur stop, držení se sedla."
  ],
  showmanship: [
    "POZOR: Tato disciplína se hodnotí od -3 (Extrémně špatné) do +3 (Excelentní) v CELÝCH BODECH!",
    "Penalizace: Malá = 3 b., Velká = 5 b., Závažná = 10 b."
  ]
};

const getRulesForDiscipline = (disciplineName) => {
  if (!disciplineName) return disciplineRuleHints.default;
  const nameL = disciplineName.toLowerCase();
  if (nameL.includes('ranch') || nameL.includes('riding')) return disciplineRuleHints.ranch;
  if (nameL.includes('trail')) return disciplineRuleHints.trail;
  if (nameL.includes('reining')) return disciplineRuleHints.reining;
  if (nameL.includes('showmanship') || nameL.includes('horsemanship')) return disciplineRuleHints.showmanship;
  return disciplineRuleHints.default;
};

export default function Home() {
  // Stavy aplikace
  const [currentTab, setCurrentTab] = useState('app'); 
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Datové stavy
  const [myHorses, setMyHorses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [scoresheets, setScoresheets] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]); 
  
  // Formuláře (Registrace do závodu)
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedHorse, setSelectedHorse] = useState('');
  const [newHorseName, setNewHorseName] = useState(''); 
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [riderBirthDate, setRiderBirthDate] = useState('');
  const [horseBirthDate, setHorseBirthDate] = useState('');
  const [horseIdNumber, setHorseIdNumber] = useState('');
  
  // Offline registrace
  const [offlineRiderName, setOfflineRiderName] = useState('');
  const [offlineHorseName, setOfflineHorseName] = useState('');
  const [offlineAgeCategory, setOfflineAgeCategory] = useState('18+');
  const [offlineRiderBirthDate, setOfflineRiderBirthDate] = useState('');
  const [offlineHorseBirthDate, setOfflineHorseBirthDate] = useState('');
  const [offlineHorseIdNumber, setOfflineHorseIdNumber] = useState('');

  // Formuláře (Admin)
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editManeuvers, setEditManeuvers] = useState(''); 
  const [editDiscOrder, setEditDiscOrder] = useState('');
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

  // UI stavy
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 
  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  // Hodnocení (Rozhodčí)
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill('0')); 
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill('')); 
  const [judgeManeuversText, setJudgeManeuversText] = useState(''); 
  const [actualJudgeName, setActualJudgeName] = useState('');
  const [isDq, setIsDq] = useState(false);

  // Reference pro žlutou vysílačku (detekce nové zprávy)
  const lastInternalMsgRef = useRef('');
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
      if (evts) {
        setEvents(evts);
        
        // ŽLUTÁ VYSÍLAČKA - Pípnutí a vibrace při nové zprávě
        const currentRole = profile?.role || simulatedRole;
        if (['admin', 'superadmin', 'judge', 'speaker'].includes(currentRole)) {
          const activeEv = evts.find(e => e.id === adminSelectedEvent || e.id === judgeEvent) || evts.find(e => e.is_locked) || evts[0];
          if (activeEv && activeEv.internal_message && activeEv.internal_message !== lastInternalMsgRef.current) {
            if (lastInternalMsgRef.current !== '') {
               playAlert(); 
            }
            lastInternalMsgRef.current = activeEv.internal_message;
          }
        }
      }

      const currentRoleCheck = profile?.role || simulatedRole;
      if (['admin', 'superadmin', 'judge', 'speaker'].includes(currentRoleCheck)) {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*');
        if (scores) setScoresheets(scores);
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [profile, adminSelectedEvent, judgeEvent, simulatedRole]);

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

        const role = prof?.role;
        if (['admin', 'superadmin', 'judge', 'speaker'].includes(role)) {
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

        if (role === 'superadmin') {
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

  const handleUpdateInternalMessage = async (eventId, currentMessage) => {
    const msg = prompt("Zadejte TAJNOU zprávu pro štáb (vidí ji Admin, Rozhodčí, Spíkr ve žlutém poli):", currentMessage || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ internal_message: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else {
        await logSystemAction('Změna tajné zprávy pro štáb', { msg });
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
    const { error } = await supabase.from('pricing').insert([{ 
      discipline_name: newDiscName, 
      price: parseInt(newDiscPrice), 
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
    alert('Odesláno na veřejný Telegram!');
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
    // PŘÍSNÁ KONTROLA ROLE: Smí jen Rozhodčí nebo Superadmin
    const currentRole = profile?.role || simulatedRole;
    if (currentRole !== 'judge' && currentRole !== 'superadmin') {
      alert("Nemáte oprávnění upravovat startovní pořadí (DRAW)!");
      return;
    }
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
      alert('Názvy manévrů uloženy do ceníku a archů.');
      checkUser();
    }
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}? (Odešle se přes žlutou vysílačku štábu)`)){
        await handleUpdateInternalMessage(judgeEvent || adminSelectedEvent, `DISCIPLÍNA ${discName} DOKONČENA. Čekám na další pokyny.`);
        alert('Oznámeno štábu!');
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
    // PŘÍSNÁ KONTROLA ROLE: Smí jen Rozhodčí nebo Superadmin
    const currentRole = profile?.role || simulatedRole;
    if (currentRole !== 'judge' && currentRole !== 'superadmin') {
      alert("Chyba: Pouze Zapisovatel (nebo Superadmin) může ukládat hodnocení!");
      return;
    }

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
      await logSystemAction('Uloženo hodnocení', { rider: evaluatingParticipant.rider_name, total, isDq });
      alert('Hodnocení uloženo!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };
  const renderPrintableStartlist = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;
    
    const currentRole = simulatedRole || profile?.role || 'player';
    
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
                        {/* DRAW SMÍ UPRAVIT JEN ZAPISOVATEL NEBO SUPERADMIN */}
                        {(currentRole === 'judge' || currentRole === 'superadmin') ? (
                          <input 
                            type="number" 
                            className="no-print"
                            defaultValue={r.draw_order || ''} 
                            onBlur={(e) => updateParticipantDraw(r.id, e.target.value)}
                            style={{width: '60px', padding: '5px', textAlign: 'center', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px'}}
                          />
                        ) : (
                          <span style={{fontWeight: 'bold', color: '#888'}} className="no-print">{r.draw_order || '-'}</span>
                        )}
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
            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => {
               if (a.draw_order && b.draw_order) return a.draw_order - b.draw_order;
               return a.start_number - b.start_number;
            });
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
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '8px', width: '50px', textAlign: 'center' }}>DRAW</th>
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
                                  {scoreObj && val !== 0 ? (val > 0 ? `+${val}` : val) : (scoreObj && !isDqScore ? '0' : '')}
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

  if (loading) return <div style={{textAlign:'center', padding:'50px', fontSize:'1.5rem', color:'#666'}}>Kouzlím aplikaci... ✨</div>;

  const currentRole = simulatedRole || profile?.role || 'player';

  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].sort((a,b) => {
      const pA = pricing.find(p => p.discipline_name === a)?.order_index || 0;
      const pB = pricing.find(p => p.discipline_name === b)?.order_index || 0;
      return pA - pB;
  }) : [];

  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => {
      if (a.draw_order && b.draw_order) return a.draw_order - b.draw_order;
      return a.start_number - b.start_number;
  }) : [];

  const lockedEvent = events.find(ev => ev.is_locked);
  const speakerEventId = lockedEvent?.id;
  const speakerDiscipline = lockedEvent?.active_discipline;
  const speakerStartList = speakerEventId && speakerDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerDiscipline).sort((a, b) => {
      if (a.draw_order && b.draw_order) return a.draw_order - b.draw_order;
      return a.start_number - b.start_number;
  }) : [];

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      color: '#333',
      paddingBottom: '50px'
    }}>
{/* HEADER */}
      <header className="no-print" style={{
        backgroundColor: '#1a2b3c', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{margin:0, fontSize:'1.5rem', letterSpacing:'1px'}}>WESTERN DIGITAL SCORE ⭐</h1>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          {user && <span style={{fontSize:'0.9rem', opacity:0.8}}>{profile?.full_name || user.email} ({currentRole})</span>}
          {user && <button onClick={handleSignOut} style={{backgroundColor:'#e74c3c', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Odhlásit</button>}
        </div>
      </header>

      {/* SUPERADMIN - BOŽSKÉ OKO A SIMULACE ROLÍ */}
      {profile?.role === 'superadmin' && (
        <div className="no-print" style={{backgroundColor: '#000', color: '#fff', padding: '10px 20px', display: 'flex', gap: '15px', alignItems: 'center', overflowX: 'auto'}}>
          <strong style={{color: '#fbc02d'}}>⚡ MEGA BŮH:</strong>
          <button onClick={() => setSimulatedRole('superadmin')} style={currentRole === 'superadmin' ? styles.activeTab : styles.tab}>Superadmin</button>
          <button onClick={() => setSimulatedRole('admin')} style={currentRole === 'admin' ? styles.activeTab : styles.tab}>Admin</button>
          <button onClick={() => setSimulatedRole('judge')} style={currentRole === 'judge' ? styles.activeTab : styles.tab}>Rozhodčí</button>
          <button onClick={() => setSimulatedRole('speaker')} style={currentRole === 'speaker' ? styles.activeTab : styles.tab}>Spíkr</button>
          <button onClick={() => setSimulatedRole('player')} style={currentRole === 'player' ? styles.activeTab : styles.tab}>Hráč</button>
        </div>
      )}

      <main style={{maxWidth: '1200px', margin: '20px auto', padding: '0 15px'}}>
        
        {/* ŽLUTÁ VYSÍLAČKA - INTERNÍ KOMUNIKACE ŠTÁBU */}
        {user && ['admin', 'superadmin', 'judge', 'speaker'].includes(currentRole) && (
          <div className="no-print" style={{
            backgroundColor: '#ffff00', border: '4px solid #ccaa00', padding: '15px', marginBottom: '20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', animation: 'pulse 2s infinite'
          }}>
            <h3 style={{margin:'0 0 10px 0', color:'#333', display:'flex', alignItems:'center', gap:'10px'}}>
              📳 ŽLUTÁ VYSÍLAČKA (TAJNÝ KANÁL ŠTÁBU)
            </h3>
            <div style={{backgroundColor:'white', padding:'15px', borderRadius:'5px', border:'1px inset #ccc', minHeight:'50px', fontSize:'1.2rem', fontWeight:'bold', color:'black'}}>
              {events.find(e => e.id === adminSelectedEvent || e.id === judgeEvent || e.is_locked)?.internal_message || "Žádné nové pokyny od štábu."}
            </div>
            <div style={{marginTop:'10px', display:'flex', gap:'10px'}}>
               <button 
                 onClick={() => handleUpdateInternalMessage(adminSelectedEvent || judgeEvent || events.find(e => e.is_locked)?.id, events.find(e => e.id === adminSelectedEvent || e.id === judgeEvent || e.is_locked)?.internal_message)} 
                 style={{backgroundColor:'#333', color:'white', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontWeight: 'bold'}}
               >
                 Odeslat novou zprávu štábu
               </button>
            </div>
          </div>
        )}

        {!user ? (
          /* PŘIHLÁŠENÍ / REGISTRACE */
          <div style={{maxWidth:'400px', margin:'50px auto', backgroundColor:'white', padding:'30px', borderRadius:'15px', boxShadow:'0 10px 25px rgba(0,0,0,0.1)'}}>
            <h2 style={{textAlign:'center', marginBottom:'25px'}}>{isResettingPassword ? 'Obnova hesla' : (isSignUp ? 'Vytvořit účet kovboje' : 'Vítejte v sedle!')}</h2>
            <form onSubmit={isResettingPassword ? handleResetPassword : handleAuth}>
              <div style={{marginBottom:'15px'}}>
                <label style={styles.label}>E-mail</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} style={styles.input} required />
              </div>
              <div style={{marginBottom:'20px'}}>
                <label style={styles.label}>Heslo</label>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={styles.input} required />
              </div>
              <button type="submit" style={styles.btnSave}>
                {isResettingPassword ? 'Uložit nové heslo' : (isSignUp ? 'Zaregistrovat se' : 'Vstoupit do arény')}
              </button>
            </form>
            <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.85rem'}}>
              {!isResettingPassword && (
                <>
                  <span onClick={()=>setIsSignUp(!isSignUp)} style={{cursor:'pointer', color:'#3498db', textDecoration:'underline'}}>
                    {isSignUp ? 'Již máte účet? Přihlaste se' : 'Ještě nemáte účet? Zaregistrujte se'}
                  </span>
                  <br /><br />
                  <span onClick={()=>setIsResettingPassword(true)} style={{cursor:'pointer', color:'#e67e22'}}>Zapomněli jste heslo?</span>
                </>
              )}
            </div>
          </div>
        ) : (
          /* HLAVNÍ OBSAH PRO PŘIHLÁŠENÉ */
          <div className="main-grid-print-fix" style={{display:'grid', gridTemplateColumns: (currentRole === 'player') ? '350px 1fr' : '1fr', gap:'30px'}}>
            
            {/* LEVÝ PANEL - PROFIL A KONĚ (POUZE PRO HRÁČE) */}
            {(currentRole === 'player') && (
              <aside className="no-print">
                <div style={styles.adminSection}>
                  <h3 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px'}}>👤 Můj Profil</h3>
                  {editMode ? (
                    <form onSubmit={updateProfile}>
                      <input type="text" placeholder="Celé jméno" value={profile?.full_name || ''} onChange={(e)=>setProfile({...profile, full_name: e.target.value})} style={styles.inputSmall} />
                      <input type="text" placeholder="Telefon" value={profile?.phone || ''} onChange={(e)=>setProfile({...profile, phone: e.target.value})} style={styles.inputSmall} />
                      <input type="text" placeholder="Stáj / Ranč" value={profile?.stable || ''} onChange={(e)=>setProfile({...profile, stable: e.target.value})} style={styles.inputSmall} />
                      <input type="text" placeholder="Město" value={profile?.city || ''} onChange={(e)=>setProfile({...profile, city: e.target.value})} style={styles.inputSmall} />
                      <button type="submit" style={{...styles.btnSave, backgroundColor:'#27ae60'}}>Uložit profil</button>
                    </form>
                  ) : (
                    <div style={{fontSize:'0.9rem', lineHeight:'1.6'}}>
                      <p><strong>Jméno:</strong> {profile?.full_name || 'Nevyplněno'}</p>
                      <p><strong>Telefon:</strong> {profile?.phone || 'Nevyplněno'}</p>
                      <p><strong>Stáj:</strong> {profile?.stable || 'Nevyplněno'}</p>
                      <p><strong>Město:</strong> {profile?.city || 'Nevyplněno'}</p>
                      <button onClick={()=>setEditMode(true)} style={{...styles.btnSave, backgroundColor:'#3498db', padding:'8px'}}>Upravit profil</button>
                    </div>
                  )}
                </div>

                <div style={{...styles.adminSection, marginTop:'20px'}}>
                  <h3 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'10px'}}>🐎 Moji koně</h3>
                  <ul style={{listStyle:'none', padding:0}}>
                    {myHorses.map(h => (
                      <li key={h.id} style={{padding:'8px 0', borderBottom:'1px solid #f9f9f9'}}><strong>{h.name}</strong></li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}

            {/* PRAVÝ PANEL - OBSAH DLE ROLE */}
            <section>
               {/* NAVIGACE PRO ADMINA A SPECIÁLNÍ ROLE */}
               {['admin', 'superadmin', 'judge', 'speaker'].includes(currentRole) && (
                 <div className="no-print" style={{display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap'}}>
                   {['admin', 'superadmin'].includes(currentRole) && <button onClick={()=>setPlayerTab('admin')} style={playerTab==='admin' ? styles.activeTabLg : styles.tabLg}>⚙️ Administrace</button>}
                   {['judge', 'superadmin'].includes(currentRole) && <button onClick={()=>setPlayerTab('judge')} style={playerTab==='judge' ? styles.activeTabLg : styles.tabLg}>⚖️ Panel Zapisovatele</button>}
                   {['speaker', 'superadmin'].includes(currentRole) && <button onClick={()=>setPlayerTab('speaker')} style={playerTab==='speaker' ? styles.activeTabLg : styles.tabLg}>🎙️ Aréna (Spíkr)</button>}
                   <button onClick={()=>setPlayerTab('main')} style={playerTab==='main' ? styles.activeTabLg : styles.tabLg}>📋 Listiny a Výsledky</button>
                 </div>
               )}

               {playerTab === 'main' && (
                 <div style={styles.adminSection}>
                   <h3 className="no-print" style={{marginTop:0, color:'#1a2b3c', borderBottom:'2px solid #eee', paddingBottom:'10px'}}>🏆 Události a startovní listiny</h3>
                   
                   {currentRole === 'player' && (
                     <div style={{background:'#fdf6e3', padding:'20px', borderRadius:'10px', marginBottom:'25px', border:'1px solid #eee'}}>
                       <h4 style={{margin:'0 0 15px 0', color:'#1a2b3c'}}>Nová přihláška do závodu</h4>
                       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                         <div style={{gridColumn:'1 / -1'}}>
                            <label style={styles.label}>Jméno jezdce (pokud se liší od profilu):</label>
                            <input type="text" placeholder="Jméno a příjmení" value={customRiderName} onChange={(e)=>setCustomRiderName(e.target.value)} style={styles.inputSmall} />
                         </div>
                         <div>
                            <label style={styles.label}>Datum narození jezdce:</label>
                            <input type="date" value={riderBirthDate} onChange={(e)=>setRiderBirthDate(e.target.value)} style={styles.inputSmall} />
                         </div>
                         <div>
                            <label style={styles.label}>Kategorie:</label>
                            <select value={riderAgeCategory} onChange={(e)=>setRiderAgeCategory(e.target.value)} style={styles.inputSmall}>
                               <option value="18+">Dospělý (18+)</option>
                               <option value="<18">Dítě / Začátečník</option>
                            </select>
                         </div>
                         <div>
                            <label style={styles.label}>Vyberte závod:</label>
                            <select value={selectedEvent} onChange={(e)=>setSelectedEvent(e.target.value)} style={styles.inputSmall}>
                               <option value="">-- Zvolte termín --</option>
                               {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                            </select>
                         </div>
                         <div>
                            <label style={styles.label}>Vyberte koně:</label>
                            <select value={selectedHorse} onChange={(e)=>setSelectedHorse(e.target.value)} style={styles.inputSmall}>
                               <option value="">-- Moje koně --</option>
                               {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                               <option value="new">+ Přidat nového koně</option>
                            </select>
                         </div>
                       </div>
                       
                       {selectedHorse === 'new' && (
                         <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginTop:'15px', padding:'15px', background:'#eee', borderRadius:'8px'}}>
                           <div>
                              <label style={styles.label}>Jméno koně:</label>
                              <input type="text" placeholder="Jméno" value={newHorseName} onChange={(e)=>setNewHorseName(e.target.value)} style={styles.inputSmall} />
                           </div>
                           <div>
                              <label style={styles.label}>Narození koně:</label>
                              <input type="date" value={horseBirthDate} onChange={(e)=>setHorseBirthDate(e.target.value)} style={styles.inputSmall} />
                           </div>
                           <div>
                              <label style={styles.label}>ID (číslo průkazu):</label>
                              <input type="text" placeholder="ID" value={horseIdNumber} onChange={(e)=>setHorseIdNumber(e.target.value)} style={styles.inputSmall} />
                           </div>
                         </div>
                       )}

                       <div style={{marginTop:'15px'}}>
                         <label style={styles.label}>Vyberte disciplíny:</label>
                         <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'5px'}}>
                           {pricing.map(p => (
                             <label key={p.id} style={{
                               padding:'8px 15px', 
                               background: selectedDisciplines.find(d=>d.id===p.id)?'#1a2b3c':'#fff', 
                               color: selectedDisciplines.find(d=>d.id===p.id)?'white':'#333', 
                               borderRadius:'20px', 
                               cursor:'pointer', 
                               fontSize:'0.85rem',
                               border: '1px solid #ddd'
                             }}>
                               <input type="checkbox" style={{display:'none'}} onChange={()=>{
                                 const exists = selectedDisciplines.find(d=>d.id===p.id);
                                 setSelectedDisciplines(exists ? selectedDisciplines.filter(d=>d.id!==p.id) : [...selectedDisciplines, p]);
                               }} />
                               {p.discipline_name} ({p.price} Kč)
                             </label>
                           ))}
                         </div>
                       </div>
                       <button onClick={handleRaceRegistration} style={{...styles.btnSave, backgroundColor:'#2ecc71', padding:'15px 30px'}}>ODESLAT PŘIHLÁŠKU</button>
                     </div>
                   )}

                   <div className="no-print" style={{overflowX:'auto', marginTop: '20px'}}>
                     <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                       <thead>
                         <tr style={{borderBottom:'2px solid #eee', textAlign:'left', background:'#f8f9fa'}}>
                           <th style={{padding:'12px'}}>Závod</th>
                           <th style={{padding:'12px'}}>Jezdec</th>
                           <th style={{padding:'12px'}}>Kůň</th>
                           <th style={{padding:'12px'}}>Disciplína</th>
                           <th style={{padding:'12px', textAlign:'center'}}>Záda</th>
                           <th style={{padding:'12px', textAlign:'right'}}>Výsledek</th>
                           {currentRole === 'player' && <th style={{padding:'12px', textAlign:'center'}}>Akce</th>}
                         </tr>
                       </thead>
                       <tbody>
                         {allRegistrations.sort((a,b) => b.id - a.id).map(reg => {
                           const score = scoresheets.find(s => s.participant_id === reg.id);
                           const evObj = events.find(e=>e.id===reg.event_id);
                           return (
                             <tr key={reg.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                               <td style={{padding:'12px'}}>{evObj?.name}</td>
                               <td style={{padding:'12px'}}><strong>{reg.rider_name}</strong></td>
                               <td style={{padding:'12px'}}>{reg.horse_name}</td>
                               <td style={{padding:'12px'}}>{reg.discipline}</td>
                               <td style={{padding:'12px', fontWeight:'bold', textAlign:'center'}}>{reg.start_number}</td>
                               <td style={{padding:'12px', textAlign:'right'}}>
                                 {score ? (score.is_dq ? <span style={{color:'red', fontWeight:'bold'}}>DQ</span> : <span style={{fontWeight:'bold', color:'#27ae60'}}>{score.total_score} b.</span>) : <span style={{color:'#999', fontStyle:'italic'}}>Čeká na start</span>}
                               </td>
                               {currentRole === 'player' && (
                                 <td style={{padding:'12px', textAlign:'center'}}>
                                   {!evObj?.is_locked ? <button onClick={() => handleCancelRegistration(reg.id)} style={{color: '#e57373', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer'}}>Zrušit</button> : <span style={{color: '#888'}}>Uzamčeno</span>}
                                 </td>
                               )}
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>

                   {/* TISK PRO ADMINA / ROZHODČÍHO */}
                   {['admin', 'superadmin', 'judge'].includes(currentRole) && (
                     <div className="no-print" style={{marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px'}}>
                        <h4>Tiskové sestavy (Vyberte závod)</h4>
                        <select value={adminSelectedEvent} onChange={(e) => setAdminSelectedEvent(e.target.value)} style={styles.inputSmall}>
                           <option value="">-- Vyberte závod pro tisk --</option>
                           {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                        </select>
                        {adminSelectedEvent && (
                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                             <button onClick={() => handlePrint('startlist')} style={{...styles.btnSave, backgroundColor: '#34495e'}}>🖨️ Tisk Startovní listiny</button>
                             <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnSave, backgroundColor: '#2c3e50'}}>🖨️ Tisk Scoresheetů</button>
                          </div>
                        )}
                     </div>
                   )}
                   {printMode === 'startlist' && adminSelectedEvent && renderPrintableStartlist(adminSelectedEvent)}
                   {printMode === 'scoresheets' && adminSelectedEvent && renderPrintableScoresheets(adminSelectedEvent)}
                 </div>
               )}

               {playerTab === 'judge' && ['judge', 'superadmin'].includes(currentRole) && (
                 <div style={styles.adminSection}>
                   <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                      <h2 style={{color:'#1a2b3c', margin:0}}>⚖️ Panel Zapisovatele</h2>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <input type="text" placeholder="Jméno rozhodčího" value={actualJudgeName} onChange={(e) => setActualJudgeName(e.target.value)} style={{...styles.inputSmall, margin:0, width:'200px'}} />
                      </div>
                   </div>
                   
                   {!evaluatingParticipant ? (
                     <div className="no-print">
                       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px', background:'#f0f4f8', padding:'20px', borderRadius:'10px'}}>
                         <div>
                           <label style={styles.label}>Výběr závodu:</label>
                           <select value={judgeEvent} onChange={(e)=>setJudgeEvent(e.target.value)} style={styles.input}>
                             <option value="">-- Vyberte uzamčený závod --</option>
                             {events.filter(e => e.is_locked).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                           </select>
                         </div>
                         <div>
                           <label style={styles.label}>Výběr disciplíny:</label>
                           <select value={judgeDiscipline} onChange={(e)=>handleJudgeDisciplineChange(judgeEvent, e.target.value)} style={styles.input}>
                             <option value="">-- Vyberte disciplínu --</option>
                             {pricing.map(p => <option key={p.id} value={p.discipline_name}>{p.discipline_name}</option>)}
                           </select>
                         </div>
                       </div>

                       {judgeEvent && judgeDiscipline && (
                         <div style={{marginBottom: '20px', background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #a5d6a7'}}>
                            <label style={{fontWeight: 'bold', color: '#2e7d32'}}>Názvy manévrů (tisknou se do archu):</label>
                            <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                               <input type="text" value={judgeManeuversText} onChange={e => setJudgeManeuversText(e.target.value)} placeholder="Krok, Klus, Cval..." style={{...styles.inputSmall, margin:0}} />
                               <button onClick={handleSaveManeuverNames} style={{...styles.btnSave, backgroundColor: '#2e7d32', width: 'auto', margin:0}}>Uložit</button>
                            </div>
                         </div>
                       )}

                       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                          <h4 style={{margin: 0}}>Startovní pole</h4>
                          {judgeDiscipline && <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{padding: '8px 15px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>📣 Oznámit konec disciplíny štábu</button>}
                       </div>

                       <div style={{overflowX:'auto'}}>
                         <table style={{width:'100%', borderCollapse:'collapse'}}>
                           <thead>
                             <tr style={{background:'#1a2b3c', color:'white', textAlign:'left'}}>
                               <th style={{padding:'12px', width:'90px'}}>DRAW</th>
                               <th style={{padding:'12px', width:'80px'}}>Záda</th>
                               <th style={{padding:'12px'}}>Jezdec / Kůň</th>
                               <th style={{padding:'12px', textAlign:'center'}}>Skóre</th>
                               <th style={{padding:'12px', textAlign:'center'}}>Akce</th>
                             </tr>
                           </thead>
                           <tbody>
                             {judgeStartList.map(r => {
                               const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                               return (
                                 <tr key={r.id} style={{borderBottom:'1px solid #eee', background: scoreObj ? (scoreObj.is_dq ? '#fff1f0' : '#f6ffed') : 'white'}}>
                                   <td style={{padding:'12px'}}>
                                     {/* EDITACE DRAW PŘÍMO V TABULCE */}
                                     <input 
                                       type="number" 
                                       defaultValue={r.draw_order || ''} 
                                       onBlur={(e)=>updateParticipantDraw(r.id, e.target.value)}
                                       style={{width:'60px', padding:'8px', textAlign:'center', border:'2px solid #ddd', borderRadius:'6px', fontWeight:'bold'}}
                                     />
                                   </td>
                                   <td style={{padding:'12px', fontWeight:'bold', fontSize:'1.1rem'}}>{r.start_number}</td>
                                   <td style={{padding:'12px'}}>{r.rider_name} <br/><small style={{color:'#666'}}>{r.horse_name}</small></td>
                                   <td style={{padding:'12px', textAlign:'center', fontWeight:'bold', color: scoreObj ? (scoreObj.is_dq ? 'red' : 'black') : '#ccc'}}>
                                      {scoreObj ? (scoreObj.is_dq ? 'DQ' : scoreObj.total_score) : '-'}
                                   </td>
                                   <td style={{padding:'12px', textAlign:'center'}}>
                                     <button onClick={()=>openScoresheet(r)} style={{backgroundColor: scoreObj?'#1a2b3c':'#3498db', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>
                                       {scoreObj ? 'OPRAVIT' : 'ZAPSAT'}
                                     </button>
                                   </td>
                                 </tr>
                               )
                             })}
                             {judgeStartList.length === 0 && <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', color: '#888'}}>Vyberte závod a disciplínu.</td></tr>}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   ) : (
                     <div className="no-print" style={{background:'#fff', padding:'25px', borderRadius:'15px', border:'3px solid #3498db', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
                       <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', borderBottom:'2px solid #eee', paddingBottom:'15px'}}>
                         <h2 style={{margin:0, color:'#3498db'}}>HODNOCENÍ: {evaluatingParticipant.rider_name}</h2>
                         <button onClick={()=>setEvaluatingParticipant(null)} style={{background:'#eee', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>ZAVŘÍT</button>
                       </div>

                       <div style={{backgroundColor:'#fff1f0', padding:'20px', borderRadius:'12px', border:'2px solid #ff4d4f', marginBottom:'25px', textAlign:'center'}}>
                          <label style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'20px', color:'#cf1322', fontWeight:'bold', cursor:'pointer', fontSize:'1.4rem'}}>
                            <input type="checkbox" checked={isDq} onChange={(e)=>setIsDq(e.target.checked)} style={{transform:'scale(2)'}} />
                            DISKVALIFIKACE (DQ)
                          </label>
                       </div>

                       <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', opacity: isDq ? 0.3 : 1, pointerEvents: isDq ? 'none' : 'auto'}}>
                         <div style={{background:'#f9f9f9', padding:'20px', borderRadius:'12px'}}>
                           <h4 style={{marginTop:0, borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>MANÉVRY</h4>
                           {maneuverScores.map((s, i) => {
                             const mNames = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline)?.maneuver_names?.split(',') || [];
                             const mName = mNames[i]?.trim() || `M${i+1}`;
                             return (
                               <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems:'center'}}>
                                 <span style={{fontWeight:'bold'}}>{mName}:</span>
                                 <select value={s} onChange={(e)=>handleManeuverChange(i, e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'1px solid #ccc', fontWeight:'bold', width:'80px'}}>
                                   {["-1.5", "-1", "-0.5", "0", "+0.5", "+1", "+1.5", "-3", "-2", "+2", "+3"].map(v => <option key={v} value={v}>{v}</option>)}
                                 </select>
                               </div>
                             );
                           })}
                         </div>
                         <div style={{background:'#fff1f0', padding:'20px', borderRadius:'12px'}}>
                           <h4 style={{marginTop:0, borderBottom:'1px solid #ffa39e', paddingBottom:'10px', color:'#cf1322'}}>PENALTY</h4>
                           {penaltyScores.map((s, i) => {
                             const mNames = pricing.find(p => p.discipline_name === evaluatingParticipant.discipline)?.maneuver_names?.split(',') || [];
                             const mName = mNames[i]?.trim() || `P${i+1}`;
                             return (
                               <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems:'center'}}>
                                 <span style={{fontWeight:'bold', color:'#cf1322'}}>u {mName}:</span>
                                 <input type="number" step="0.5" min="0" value={s} onChange={(e)=>handlePenaltyChange(i, e.target.value)} style={{width:'80px', padding:'8px', borderRadius:'6px', border:'1px solid #ffa39e', textAlign:'center', color:'#cf1322', fontWeight:'bold'}} />
                               </div>
                             );
                           })}
                         </div>
                       </div>
                       
                       <div style={{marginTop:'30px', textAlign:'right', fontSize:'2rem', fontWeight:'900', borderTop:'4px solid #3498db', paddingTop:'20px', color: isDq ? 'red' : '#1a2b3c'}}>
                         FINÁLNÍ SKÓRE: {isDq ? 'DQ' : calculateTotalScore()}
                       </div>
                       <button onClick={saveScore} style={{width:'100%', padding:'20px', backgroundColor:'#2ecc71', color:'white', border:'none', borderRadius:'12px', cursor:'pointer', fontWeight:'bold', fontSize:'1.2rem', marginTop:'20px'}}>ULOŽIT HODNOCENÍ</button>
                     </div>
                   )}
                 </div>
               )}

               {playerTab === 'speaker' && ['speaker', 'superadmin'].includes(currentRole) && (
                 <div className="no-print" style={styles.adminSection}>
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', borderBottom:'3px solid #8d6e63', paddingBottom:'15px'}}>
                      <h2 style={{color:'#5d4037', margin:0}}>🎙️ POHLED SPÍKRA (ARÉNA)</h2>
                      <span style={{background:'#efebe9', color:'#5d4037', padding:'5px 15px', borderRadius:'20px', fontWeight:'bold'}}>ŽIVĚ</span>
                   </div>

                   {speakerStartList.length > 0 ? (
                     <table style={{width:'100%', borderCollapse:'collapse', fontSize:'1.4rem'}}>
                       <thead>
                         <tr style={{background:'#5d4037', color:'white', textAlign:'left'}}>
                           <th style={{padding:'20px', width:'100px'}}>DRAW</th>
                           <th style={{padding:'20px', width:'120px'}}>ZÁDA</th>
                           <th style={{padding:'20px'}}>JEZDEC / KŮŇ</th>
                           <th style={{padding:'20px', textAlign:'right'}}>SKÓRE</th>
                         </tr>
                       </thead>
                       <tbody>
                         {speakerStartList.map(r => {
                           const score = scoresheets.find(s => s.participant_id === r.id);
                           return (
                             <tr key={r.id} style={{borderBottom:'2px solid #eee', background: score?'#f6ffed':'white'}}>
                               <td style={{padding:'20px', fontWeight:'900', color:'#5d4037'}}>{r.draw_order || '-'}</td>
                               <td style={{padding:'20px', fontWeight:'bold', fontSize:'1.8rem'}}>{r.start_number}</td>
                               <td style={{padding:'20px'}}>
                                  <div style={{fontWeight:'900', textTransform:'uppercase'}}>{r.rider_name}</div>
                                  <div style={{fontSize:'1rem', color:'#666', fontStyle:'italic'}}>{r.horse_name}</div>
                               </td>
                               <td style={{padding:'20px', textAlign:'right', fontWeight:'900', fontSize:'2rem', color: score ? (score.is_dq ? 'red' : '#27ae60') : '#ccc'}}>
                                 {score ? (score.is_dq ? 'DQ' : `${score.total_score} b.`) : '---'}
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   ) : (
                     <div style={{textAlign:'center', padding:'100px 20px', color:'#999'}}>
                        <div style={{fontSize:'5rem'}}>⏳</div>
                        <p style={{fontSize:'1.5rem'}}>Čekám na spuštění disciplíny v aréně...</p>
                     </div>
                   )}
                 </div>
               )}

               {playerTab === 'admin' && ['admin', 'superadmin'].includes(currentRole) && (
                 <div className="no-print" style={styles.adminSection}>
                   <h2 style={{color:'#1a2b3c', margin:'0 0 20px 0', borderBottom:'2px solid #eee', paddingBottom:'10px'}}>⚙️ Administrace a Ceník</h2>
                   
                   <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'25px'}}>
                     <div style={{background: '#f9f9f9', padding: '15px', borderRadius: '10px', border: '1px solid #ddd'}}>
                       <h4 style={{marginTop:0}}>Vypsat nový termín závodů</h4>
                       <input type="text" placeholder="Název závodů" value={newEventName} onChange={(e)=>setNewEventName(e.target.value)} style={styles.inputSmall} />
                       <input type="date" value={newEventDate} onChange={(e)=>setNewEventDate(e.target.value)} style={styles.inputSmall} />
                       <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <input type="number" placeholder="Čísla od" value={newStartNumFrom} onChange={(e)=>setNewStartNumFrom(e.target.value)} style={styles.inputSmall} />
                          <input type="number" placeholder="do" value={newStartNumTo} onChange={(e)=>setNewStartNumTo(e.target.value)} style={styles.inputSmall} />
                       </div>
                       <button onClick={handleCreateEvent} style={styles.btnSave}>VYPSAT ZÁVOD</button>
                     </div>

                     <div style={{background: '#f9f9f9', padding: '15px', borderRadius: '10px', border: '1px solid #ddd'}}>
                       <h4 style={{marginTop:0}}>Ceník a disciplíny</h4>
                       <input type="text" placeholder="Název disciplíny" value={newDiscName} onChange={(e)=>setNewDiscName(e.target.value)} style={styles.inputSmall} />
                       <input type="number" placeholder="Cena (Kč)" value={newDiscPrice} onChange={(e)=>setNewDiscPrice(e.target.value)} style={styles.inputSmall} />
                       <input type="number" placeholder="Pořadí (Order)" value={newDiscOrder} onChange={(e)=>setNewDiscOrder(e.target.value)} style={styles.inputSmall} title="Určuje pořadí v listinách" />
                       <button onClick={handleCreatePricing} style={{...styles.btnSave, backgroundColor:'#27ae60'}}>PŘIDAT DISCIPLÍNU</button>
                     </div>
                   </div>

                   <div style={{marginTop: '25px', background: '#e3f2fd', padding: '15px', borderRadius: '10px', border: '1px solid #64b5f6'}}>
                      <h4 style={{marginTop:0, color: '#1565c0'}}>📢 Veřejný Telegram (Pro všechny hráče)</h4>
                      <input type="text" placeholder="Napište rychlý vzkaz všem účastníkům..." value={manualTgMessage} onChange={(e) => setManualTgMessage(e.target.value)} style={styles.input} />
                      <button onClick={sendManualTgMessage} style={{...styles.btnSave, backgroundColor: '#1565c0'}}>Odeslat veřejné oznámení</button>
                   </div>
                   
                   <h3 style={{marginTop:'40px', color:'#1a2b3c'}}>Aktivní události</h3>
                   {events.map(ev => (
                     <div key={ev.id} style={{
                        padding:'20px', background: ev.is_locked ? '#fff7e6' : '#f6ffed', borderRadius:'12px', marginBottom:'15px', display:'flex', justifyContent:'space-between', alignItems:'center', border: ev.is_locked ? '1px solid #ffd591' : '1px solid #b7eb8f'
                      }}>
                       <div>
                          <strong style={{fontSize:'1.1rem'}}>{ev.name}</strong>
                          <div style={{fontSize:'0.85rem', color:'#666'}}>{new Date(ev.event_date).toLocaleDateString('cs-CZ')}</div>
                       </div>
                       <div style={{display:'flex', gap:'12px', flexWrap: 'wrap'}}>
                         <button onClick={()=>toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{padding:'8px 15px', backgroundColor: ev.is_locked?'#e67e22':'#2ecc71', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                           {ev.is_locked ? '🔒 UZAMČENO' : '🔓 OTEVŘENO'}
                         </button>
                         <button onClick={()=>handleEndCompetitionAndSendResults(ev.id)} style={{padding:'8px 15px', backgroundColor:'#8e44ad', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>
                           🏆 VYHLÁSIT VÝSLEDKY NA TG
                         </button>
                         <button onClick={()=>handleDeleteEvent(ev.id, ev.name)} style={{padding:'8px 15px', backgroundColor:'#ff4d4f', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold'}}>SMAZAT</button>
                       </div>
                     </div>
                   ))}

                   {/* MEGA BŮH - TVORBA ÚČTŮ */}
                   {currentRole === 'superadmin' && (
                     <div style={{marginTop: '40px', background: '#ffebee', padding: '20px', borderRadius: '10px', border: '2px solid #ef5350'}}>
                        <h3 style={{marginTop:0, color: '#c62828'}}>⚡ Superadmin: Tvorba speciálních účtů</h3>
                        <form onSubmit={handleCreateAccount} style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                           <input type="email" placeholder="E-mail" value={newAccountEmail} onChange={(e) => setNewAccountEmail(e.target.value)} style={{...styles.inputSmall, margin:0}} required />
                           <select value={newAccountRole} onChange={(e) => setNewAccountRole(e.target.value)} style={{...styles.inputSmall, margin:0}}>
                              <option value="judge">Rozhodčí (Zapisovatel)</option>
                              <option value="speaker">Spíkr (Aréna)</option>
                              <option value="admin">Administrátor</option>
                           </select>
                           <button type="submit" style={{...styles.btnSave, backgroundColor: '#c62828', width: 'auto', margin:0, whiteSpace: 'nowrap'}}>Vytvořit přístup</button>
                        </form>
                     </div>
                   )}
                 </div>
               )}

            </section>
          </div>
        )}

        {/* LOGY PRO SUPERADMINA */}
        {profile?.role === 'superadmin' && (
          <div className="no-print" style={{marginTop: '50px', background: '#222', color: '#0f0', padding: '20px', borderRadius: '10px', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto'}}>
            <h3 style={{marginTop: 0, color: '#fff'}}>Terminal Logs (Vidí jen Mega Bůh)</h3>
            {systemLogs.map(log => (
               <div key={log.id} style={{borderBottom: '1px solid #444', padding: '5px 0'}}>
                 <span style={{color: '#888'}}>[{new Date(log.created_at).toLocaleString()}]</span> 
                 <strong style={{marginLeft: '10px', color: '#ffb300'}}>{log.action}</strong>
                 <span style={{marginLeft: '10px'}}>{JSON.stringify(log.details)}</span>
               </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 0, 0.7); transform: scale(1); }
          50% { box-shadow: 0 0 0 15px rgba(255, 255, 0, 0); transform: scale(1.01); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 0, 0); transform: scale(1); }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; font-size: 11pt; }
          .print-area { width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .page-break { page-break-after: always; position: relative; }
          table { font-size: 11pt !important; }
          .main-grid-print-fix { display: block !important; }
        }
        select, input { outline: none; transition: border 0.2s; }
        select:focus, input:focus { border-color: #3498db !important; }
      `}</style>
    </div>
  )
}

const styles = {
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '2px solid #ddd', fontSize: '1rem', boxSizing: 'border-box' },
  inputSmall: { width: '100%', padding: '10px', margin: '5px 0', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem', boxSizing: 'border-box' },
  label: { fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: '#555' },
  btnSave: { width:'100%', padding:'12px', backgroundColor:'#1a2b3c', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginTop:'10px', fontSize:'0.95rem' },
  adminSection: { background:'#fff', padding:'25px', borderRadius:'15px', border:'1px solid #eee', boxShadow:'0 4px 12px rgba(0,0,0,0.05)' },
  tabLg: { padding:'10px 20px', borderRadius:'25px', border:'1px solid #ddd', cursor:'pointer', backgroundColor:'white', color:'#333', fontWeight:'bold', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
  activeTabLg: { padding:'10px 20px', borderRadius:'25px', border:'none', cursor:'pointer', backgroundColor:'#1a2b3c', color:'white', fontWeight:'bold', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' },
  tab: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  activeTab: { background: '#fbc02d', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }
};
