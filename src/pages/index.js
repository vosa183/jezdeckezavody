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
    "POZOR: Tato disciplína (Showmanship/Horsemanship) se hodnotí od -3 (Extrémně špatné) do +3 (Excelentní)!",
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
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [customRiderName, setCustomRiderName] = useState(''); 
  
  // NOVÁ POLÍČKA PRO REGISTRACI A PDF (TVÁ PŮVODNÍ + NOVÁ PRO DATUMY/ID)
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [patternFile, setPatternFile] = useState(null);
  const [riderBirthDate, setRiderBirthDate] = useState('');
  const [horseBirthDate, setHorseBirthDate] = useState('');
  const [horseIdNumber, setHorseIdNumber] = useState('');
  const [isDq, setIsDq] = useState(false);

  // STAVY PRO INLINE EDITACI CENÍKU
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editPatternFile, setEditPatternFile] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [manualTgMessage, setManualTgMessage] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');

  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuverScores, setManeuverScores] = useState(Array(10).fill(0));
  const [penaltyScores, setPenaltyScores] = useState(Array(10).fill(0));

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 

  // Reference pro žlutou vysílačku (detekce nové zprávy)
  const lastInternalMsgRef = useRef('');
  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) {
        setEvents(evts);
        
        // ŽLUTÁ VYSÍLAČKA - Detekce změn a upozornění pro štáb
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

      if (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'judge' || profile?.role === 'speaker') {
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
    await supabase.from('system_logs').insert([{
      user_id: user.id,
      action: actionDesc,
      details: detailData
    }]);
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

        const { data: prices } = await supabase.from('pricing').select('*').order('id');
        setPricing(prices || []);

        const isStaff = prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker';
        
        if (isStaff) {
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

  const handleUpdateInternalMessage = async (eventId, currentMessage) => {
    const msg = prompt("Zadejte TAJNOU zprávu pro štáb (vidí ji Admin, Rozhodčí, Spíkr ve žlutém poli). Smazáním textu zprávu zrušíte:", currentMessage || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ internal_message: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else {
        await logSystemAction('Změna tajné zprávy pro štáb', { msg });
        checkUser(); 
      }
    }
  };

  const handleUpdateSpeakerMessage = async (eventId, currentMessage) => {
    const msg = prompt("Zadejte rychlý vzkaz POUZE pro hlasatele. Smazáním textu vzkaz zrušíte:", currentMessage || "");
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
      await logSystemAction('Vypsán nový závod', { name: newEventName, from: newStartNumFrom, to: newStartNumTo });
      
      const tgMsg = `🎉 <b>NOVÉ ZÁVODY VYPSÁNY!</b>\n\n` +
                    `🏆 <b>Název:</b> ${newEventName}\n` +
                    `📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\n` +
                    `Přihlášky byly právě otevřeny. Těšíme se na vás pod Humprechtem! 🤠`;
      await sendTelegramMessage(tgMsg);

      try {
        const { data: profs } = await supabase.from('profiles').select('email').not('email', 'is', null);
        if (profs && profs.length > 0) {
          const allEmails = profs.map(p => p.email).filter(e => e.includes('@'));
          if (allEmails.length > 0) {
            await fetch('/api/send-invites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventName: newEventName,
                eventDate: newEventDate,
                emails: allEmails
              })
            });
          }
        }
      } catch (mailErr) {
        console.error('Chyba při volání mailového můstku:', mailErr);
      }

      alert('Závod vytvořen a oznámení odesláno do Telegramu a e-mailem všem jezdcům!'); 
      window.location.reload(); 
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Opravdu chcete závod znovu otevřít pro přihlášky?' : 'Opravdu chcete uzamknout přihlášky a odeslat startku rozhodčímu a hlasateli?')) {
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
      const { data, error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      
      if (uploadError) {
        alert('Chyba při nahrávání souboru: ' + uploadError.message);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice), pattern_url: patternUrl }]);
    if (error) alert(error.message);
    else { 
      await logSystemAction('Nová disciplína v ceníku', { discipline: newDiscName, price: newDiscPrice });
      alert('Disciplína přidána do ceníku!'); 
      window.location.reload(); 
    }
  };

  const startEditingPricing = (p) => {
    setEditingPricingId(p.id);
    setEditDiscPrice(p.price);
    setEditPatternFile(null);
  };

  const handleSaveEditPricing = async (id, discName) => {
    let patternUrl = null;
    if (editPatternFile) {
      const fileExt = editPatternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patterns').upload(fileName, editPatternFile);
      if (uploadError) { alert('Chyba nahrávání: ' + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const updateData = { price: parseInt(editDiscPrice) };
    if (patternUrl) updateData.pattern_url = patternUrl;

    const { error } = await supabase.from('pricing').update(updateData).eq('id', id);
    if (error) alert(error.message);
    else {
      await logSystemAction('Změna disciplíny', { discipline: discName, newPrice: editDiscPrice });
      alert('Disciplína úspěšně upravena!');
      setEditingPricingId(null);
      window.location.reload();
    }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu chcete smazat disciplínu ${discName} z ceníku?`)) {
      const { error } = await supabase.from('pricing').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Smazána disciplína z ceníku', { discipline: discName });
        window.location.reload();
      }
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
    await logSystemAction('Úprava poznámky k platbě', { rider: riderName, note });
    alert('Poznámka k platbě uložena!');
  };

  const handleUpdateSchedule = async (eventId, currentSchedule) => {
    const msg = prompt("Zadejte textový plán závodů. Tento plán se ukáže všem a odešle se jako informační zpráva na Telegram:", currentSchedule || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ schedule: msg }).eq('id', eventId);
      if (error) alert(error.message);
      else {
        await logSystemAction('Změna plánu závodů', { schedule: msg });
        if (msg.trim() !== '') {
          await sendTelegramMessage(`📅 <b>AKTUÁLNÍ PLÁN ZÁVODŮ:</b>\n\n${msg}`);
        }
        alert('Plán byl uložen a úspěšně odeslán na komunikační kanál!');
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
    if(!confirm("Opravdu chcete slavnostně ukončit závody a odeslat kompletní výsledky?")) return;

    const eventObj = events.find(e => e.id === eventId);
    let tgMsg = `🏆 <b>ZÁVODY UKONČENY - CELKOVÉ VÝSLEDKY</b> 🏆\n\n<b>${eventObj.name}</b>\n\n`;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];

    disciplines.forEach(disc => {
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

    tgMsg += `Děkujeme všem jezdcům a gratulujeme vítězům! 🎉 Pokud máte zájem o originální zapsané archy s podpisem rozhodčího, naleznete je v naší skupině.`;

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

    const registrationData = await Promise.all(selectedDisciplines.map(async (d) => {
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
    }));

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) alert(error.message);
    else {
      await logSystemAction('Odeslána přihláška na závod', { horse: finalHorseName, rider: finalRiderName });
      alert(`Přihláška odeslána! Startovní číslo: ${assignedNumber}. Závodník: ${finalRiderName}`);
      setCustomRiderName('');
      setSelectedDisciplines([]);
      window.location.reload();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit tuto přihlášku? Startovní číslo se uvolní pro ostatní.")) {
      const { error } = await supabase.from('race_participants').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Hráč zrušil přihlášku', { registration_id: id });
        alert('Přihláška byla zrušena.');
        window.location.reload();
      }
    }
  };

  const updateParticipantDraw = async (id, newDraw) => {
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

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
  };
  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await handleUpdateInternalMessage(judgeEvent || adminSelectedEvent, `DISCIPLÍNA ${discName} DOKONČENA. Čekám na další pokyny.`);
        alert('Oznámeno štábu přes žlutou vysílačku!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(10).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(10).fill(0));
      setIsDq(existingScore.is_dq || false);
    } else {
      setManeuverScores(Array(10).fill(0));
      setPenaltyScores(Array(10).fill(0));
      setIsDq(false);
    }
  };

  const handleManeuverChange = (index, value) => {
    const newScores = [...maneuverScores];
    newScores[index] = parseFloat(value);
    setManeuverScores(newScores);
  };

  const handlePenaltyChange = (index, value) => {
    const newPenalties = [...penaltyScores];
    newPenalties[index] = parseFloat(value) || 0;
    setPenaltyScores(newPenalties);
  };

  const calculateTotalScore = () => {
    if (isDq) return 0;
    const baseScore = 70;
    const maneuversTotal = maneuverScores.reduce((acc, val) => acc + val, 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => acc + val, 0);
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    // PŘÍSNÁ KONTROLA ROLE
    const currentRole = profile?.role || simulatedRole;
    if (currentRole !== 'judge' && currentRole !== 'superadmin') {
      alert("Chyba: Pouze Zapisovatel (nebo Superadmin) může ukládat hodnocení!");
      return;
    }

    const total = calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores };
    
    const timestamp = new Date().toISOString();
    const judgeName = profile?.full_name || 'Neznámý rozhodčí';
    
    const dataToSign = `${evaluatingParticipant.id}-${judgeName}-${timestamp}-${total}-${isDq}-${JSON.stringify(scoreData)}`;
    const hash = await generateHash(dataToSign);

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      judge_name: judgeName,
      scored_at: timestamp,
      signature_hash: hash,
      score_data: scoreData,
      total_score: total,
      is_dq: isDq
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      await logSystemAction('Uloženo hodnocení', { rider: evaluatingParticipant.rider_name, total, isDq, hash });
      alert('Hodnocení bylo úspěšně uloženo a digitálně podepsáno!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))];

    return (
      <div className="print-area">
        {disciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádní jezdci.</p>
        ) : (
          disciplines.map(discipline => {
            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => {
              if (a.draw_order && b.draw_order) return a.draw_order - b.draw_order;
              return a.start_number - b.start_number;
            });
            if(ridersInDiscipline.length === 0) return null;

            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            
            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.5rem' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: '#444' }}>SCORESHEET: {discipline}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <strong style={{fontSize: '1.1rem'}}>Úloha (Pattern):</strong>
                    <input type="text" className="print-input" placeholder="Zadejte název úlohy" style={{ border: 'none', borderBottom: '1px dashed black', fontSize: '1.1rem', width: '250px', background: 'transparent', textAlign: 'center' }} />
                  </div>
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
                      {[1,2,3,4,5,6,7,8,9,10].map(m => (
                        <th key={m} style={{ border: '2px solid black', padding: '6px', width: '40px', textAlign: 'center', background: '#f5f5f5' }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const pTotal = scoreObj ? scoreObj.score_data.penalties.reduce((a,b)=>a+b,0) : '';
                      const isDqResult = scoreObj?.is_dq;

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
                                {scoreObj && scoreObj.score_data.penalties[i] > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                              </td>
                            ))}
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.3rem', color: isDqResult ? 'red' : 'black' }}>
                              {isDqResult ? 'DQ' : (scoreObj ? scoreObj.total_score : '')}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', padding: '4px', fontSize: '0.7rem', background: '#f9f9f9', textAlign: 'center' }}>SCORE</td>
                            {[0,1,2,3,4,5,6,7,8,9].map(i => (
                              <td key={`s-${i}`} style={{ border: '1px solid black', padding: '6px', textAlign: 'center', height: '25px' }}>
                                {scoreObj && !isDqResult && scoreObj.score_data.maneuvers[i] !== 0 ? (scoreObj.score_data.maneuvers[i] > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i]) : (scoreObj && !isDqResult ? '0' : '')}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '3px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#555' }}>Podpis rozhodčího / Judge's signature:</p>
                    <h3 style={{ margin: '0 0 5px 0' }}>{signatureObj ? signatureObj.judge_name : '_______________________'}</h3>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>Dne: {signatureObj ? new Date(signatureObj.scored_at).toLocaleString('cs-CZ') : '___________________'}</p>
                  </div>
                  
                  {scoredRiders.length > 0 && (
                    <div style={{ flex: 1, textAlign: 'right', background: '#f5f5f5', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#333' }}>DIGITÁLNÍ KONTROLNÍ OTISKY (SHA-256)</p>
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
const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#efebe9',
      color: '#3e2723',
      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '20px'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      marginBottom: '20px',
      border: '1px solid #d7ccc8'
    },
    input: {
      width: '100%',
      padding: '12px',
      marginBottom: '15px',
      borderRadius: '8px',
      border: '2px solid #d7ccc8',
      fontSize: '1rem',
      boxSizing: 'border-box'
    },
    button: {
      backgroundColor: '#5d4037',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    },
    secondaryButton: {
      backgroundColor: '#8d6e63',
      color: 'white',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer'
    },
    badge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      marginLeft: '10px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '15px'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      borderBottom: '2px solid #d7ccc8',
      backgroundColor: '#f5f5f5'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid #efebe9'
    }
  };

  if (loading) {
    return (
      <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <h2 style={{color: '#5d4037'}}>Načítám závodní systém...</h2>
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (printMode === 'startlist') return renderPrintableScoresheets(adminSelectedEvent || judgeEvent);
  if (printMode === 'scoresheets') return renderPrintableScoresheets(adminSelectedEvent || judgeEvent);

  if (!user) {
    return (
      <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <div style={{...styles.card, width: '100%', maxWidth: '450px', textAlign: 'center'}}>
          <div style={{fontSize: '4rem', marginBottom: '10px'}}>🐎</div>
          <h1 style={{color: '#5d4037', marginBottom: '5px'}}>Závody Humprecht</h1>
          <p style={{color: '#8d6e63', marginBottom: '30px'}}>Vstup pro jezdce a štáb</p>
          
          <form onSubmit={handleAuth}>
            <input 
              style={styles.input} 
              type="email" 
              placeholder="Váš e-mail" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <input 
              style={styles.input} 
              type="password" 
              placeholder="Heslo" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <button style={{...styles.button, width: '100%'}} type="submit">
              {isSignUp ? 'Vytvořit účet' : 'Přihlásit se'}
            </button>
          </form>
          <p 
            style={{marginTop: '20px', color: '#5d4037', cursor: 'pointer', textDecoration: 'underline'}}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Už máte účet? Přihlaste se' : 'Nemáte účet? Zaregistrujte se'}
          </p>
        </div>
      </div>
    );
  }

  const userRole = simulatedRole || profile?.role || 'player';

  if (currentTab === 'rules') {
    return (
      <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🐎 Závodní Portál</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: '#ffb300', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>📜 Propozice a Pravidla</button>
        </div>
        
        <div style={{...styles.card, maxWidth: '900px', margin: '0 auto'}}>
          <h2 style={{color: '#5d4037', borderBottom: '3px solid #ffb300', paddingBottom: '10px'}}>PROPOZICE ZÁVODŮ</h2>
          
          <h4 style={{color: '#5d4037', fontSize: '1.2rem', marginTop: '20px'}}>Základní informace</h4>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Závody se konají v areálu <strong>Pod Humprechtem</strong>. Jsou otevřeny pro všechny jezdce a koně bez nutnosti licence.</p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Časový plán</h4>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Veterinární přejímka bude probíhat od <strong>8:00 do 9:00</strong>. Předpokládaný čas zahájení akce je cca <strong>9:00</strong>. Čas je pouze orientační.</p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Veterinární podmínky</h4>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Kůň musí být v imunitě proti influenze (chřipce). Kůň starší 12 měsíců musí mít negativní výsledek na infekční anemii (IAE), ne starší 12 měsíců.</p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Kategorie</h4>
          <ul style={{marginBottom: '20px', fontSize: '1.1rem'}}>
            <li><strong>Open</strong> – Otevřená pro všechny.</li>
            <li><strong>Mládež Advanced</strong> – Do 18 let včetně.</li>
            <li><strong>Mládež Rookies</strong> – Do 14 let včetně (krok, klus).</li>
            <li><strong>Děti</strong> – Do 12 let včetně (s vodičem i bez).</li>
            <li><strong>Hříbata</strong> – Do 3 let včetně (In-hand disciplíny).</li>
          </ul>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Výstroj</h4>
          <p style={{fontSize: '1.1rem'}}>Povolená je westernová i anglická výstroj. V kategorii děti a mládež je <strong>povinná bezpečnostní přilba</strong>. V ostatních kategoriích je doporučená, nebo povinný klobouk.</p>
          
          <button onClick={() => setCurrentTab('app')} style={{...styles.button, marginTop: '30px'}}>Zpět do portálu</button>
        </div>
      </div>
    );
  }
return (
    <div style={styles.container}>
      {/* HORNÍ NAVIGACE */}
      <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: currentTab === 'app' ? '#ffb300' : 'transparent', color: currentTab === 'app' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🐎 Závodní Portál</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: currentTab === 'rules' ? '#ffb300' : 'transparent', color: currentTab === 'rules' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>📜 Propozice a Pravidla</button>
        </div>
        <button onClick={handleSignOut} style={{ background: '#e57373', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Odhlásit</button>
      </div>

      {/* SUPERADMIN BAR */}
      {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="no-print" style={{ background: '#000', color: '#fff', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <strong>{profile?.role === 'superadmin' ? 'SUPERADMIN:' : 'ADMIN:'}</strong>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('superadmin')} style={userRole === 'superadmin' ? { background: '#ffb300', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' } : { background: '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Superadmin</button>
          )}
          <button onClick={() => setSimulatedRole('admin')} style={userRole === 'admin' ? { background: '#ffb300', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' } : { background: '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Admin</button>
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('judge')} style={userRole === 'judge' ? { background: '#ffb300', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' } : { background: '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Rozhodčí</button>
          )}
          {profile?.role === 'superadmin' && (
            <button onClick={() => setSimulatedRole('speaker')} style={userRole === 'speaker' ? { background: '#ffb300', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' } : { background: '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Spíkr</button>
          )}
          <button onClick={() => setSimulatedRole('player')} style={userRole === 'player' ? { background: '#ffb300', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' } : { background: '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Hráč</button>
        </div>
      )}

      <div style={styles.mainGrid}>
        {/* LEVÝ PANEL - PROFIL A KONĚ */}
        <div className="no-print">
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>👤 Můj Profil</h3>
            {editMode ? (
              <form onSubmit={updateProfile}>
                <input style={styles.input} placeholder="Celé jméno" value={profile?.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} required />
                <input style={styles.input} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} required />
                <input style={styles.input} placeholder="Hospodářství / Stáj" value={profile?.stable || ''} onChange={e => setProfile({ ...profile, stable: e.target.value })} required />
                <input style={styles.input} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({ ...profile, city: e.target.value })} required />
                <button type="submit" style={styles.button}>Uložit profil</button>
                <button type="button" onClick={() => setEditMode(false)} style={{ ...styles.button, background: '#ccc', marginLeft: '10px' }}>Zrušit</button>
              </form>
            ) : (
              <div>
                <p><strong>{profile?.full_name || 'Nevyplněno'}</strong></p>
                <p>📞 {profile?.phone || 'Nevyplněno'}</p>
                <p>🏠 {profile?.city || 'Nevyplněno'}</p>
                <button onClick={() => setEditMode(true)} style={styles.secondaryButton}>Upravit údaje</button>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>🐎 Moji koně</h3>
            {myHorses.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#888' }}>Zatím žádní koně.</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {myHorses.map(h => (
                  <li key={h.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}><strong>{h.name}</strong></li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* HLAVNÍ OBSAH */}
        <div className="print-area">
          {/* ŽLUTÁ VYSÍLAČKA */}
          {['admin', 'superadmin', 'judge', 'speaker'].includes(userRole) && (
            <div style={{ ...styles.card, backgroundColor: '#ffff00', border: '4px solid #ccaa00' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>📳 ŽLUTÁ VYSÍLAČKA</h3>
              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px inset #ccc', minHeight: '50px', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                {events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.internal_message || "Ticho na lince..."}
              </div>
              <button onClick={() => handleUpdateInternalMessage(events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.id, events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.internal_message)} style={{ ...styles.button, background: '#333' }}>Poslat zprávu štábu</button>
            </div>
          )}

          {/* HRÁČSKÉ PŘIHLAŠOVÁNÍ */}
          {userRole === 'player' && (
            <div style={styles.card}>
              <h2 style={{ marginTop: 0 }}>🏆 Přihláška na závody</h2>
              <div style={{ background: '#fdf6e3', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Jméno jezdce:</label>
                <input style={styles.input} type="text" placeholder="Pokud se liší od profilu" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Datum narození jezdce:</label>
                    <input style={styles.input} type="date" value={riderBirthDate} onChange={e => setRiderBirthDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kategorie:</label>
                    <select style={styles.input} value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)}>
                      <option value="18+">Dospělý (18+)</option>
                      <option value="<18">Dítě / Mládež</option>
                    </select>
                  </div>
                </div>

                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Závod:</label>
                <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">-- Vyberte termín --</option>
                  {events.filter(e => !e.is_locked).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>

                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Kůň:</label>
                <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                  <option value="">-- Vyberte koně --</option>
                  {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                  <option value="new">+ Přidat nového koně</option>
                </select>

                {selectedHorse === 'new' && (
                  <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <input style={styles.input} placeholder="Jméno koně" value={newHorseName} onChange={e => setNewHorseName(e.target.value)} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input style={styles.input} type="date" title="Datum narození koně" value={horseBirthDate} onChange={e => setHorseBirthDate(e.target.value)} />
                      <input style={styles.input} placeholder="ID koně (číslo průkazu)" value={horseIdNumber} onChange={e => setHorseIdNumber(e.target.value)} />
                    </div>
                  </div>
                )}

                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Disciplíny:</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {pricing.map(d => (
                    <label key={d.id} style={{ padding: '10px 15px', background: selectedDisciplines.find(x => x.id === d.id) ? '#3e2723' : '#fff', color: selectedDisciplines.find(x => x.id === d.id) ? '#fff' : '#000', borderRadius: '25px', cursor: 'pointer', border: '1px solid #ddd', fontSize: '0.9rem' }}>
                      <input type="checkbox" style={{ display: 'none' }} onChange={() => {
                        const exists = selectedDisciplines.find(x => x.id === d.id);
                        setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                      }} />
                      {d.discipline_name} ({d.price} Kč)
                    </label>
                  ))}
                </div>

                <button onClick={handleRaceRegistration} style={{ ...styles.button, width: '100%', padding: '15px', fontSize: '1.2rem' }}>ODESLAT PŘIHLÁŠKU</button>
              </div>

              <h3 style={{ marginTop: '30px' }}>Moje aktivní přihlášky</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Závod</th>
                    <th style={styles.th}>Kůň</th>
                    <th style={styles.th}>Disciplína</th>
                    <th style={styles.th}>Stav / Skóre</th>
                  </tr>
                </thead>
                <tbody>
                  {allRegistrations.filter(r => r.user_id === user.id).map(r => {
                    const score = scoresheets.find(s => s.participant_id === r.id);
                    return (
                      <tr key={r.id}>
                        <td style={styles.td}>{events.find(e => e.id === r.event_id)?.name}</td>
                        <td style={styles.td}>{r.horse_name}</td>
                        <td style={styles.td}>{r.discipline}</td>
                        <td style={styles.td}>
                          {score ? (score.is_dq ? <span style={{ color: 'red', fontWeight: 'bold' }}>DQ</span> : <strong>{score.total_score} b.</strong>) : <span style={{ color: '#888' }}>Čeká na start</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ROZHODČÍ PANEL */}
          {(userRole === 'judge' || userRole === 'superadmin') && (
            <div style={styles.card}>
              <h2>⚖️ Rozhodčí panel</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <select style={styles.input} value={judgeEvent} onChange={e => setJudgeEvent(e.target.value)}>
                  <option value="">-- Vyberte uzamčený závod --</option>
                  {events.filter(e => e.is_locked).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                  <option value="">-- Vyberte disciplínu --</option>
                  {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {evaluatingParticipant ? (
                <div style={{ padding: '20px', border: '2px solid #5d4037', borderRadius: '12px' }}>
                  <h3>Hodnocení: {evaluatingParticipant.rider_name} ({evaluatingParticipant.start_number})</h3>
                  <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '2px solid red', textAlign: 'center' }}>
                    <label style={{ fontSize: '1.5rem', color: 'red', fontWeight: 'bold', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isDq} onChange={e => setIsDq(e.target.checked)} style={{ transform: 'scale(1.5)', marginRight: '10px' }} /> DISKVALIFIKACE (DQ)
                    </label>
                  </div>
                  {!isDq && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      <div>
                        <h4>Manévry</h4>
                        {maneuverScores.map((s, i) => (
                          <div key={i} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>M{i + 1}:</span>
                            <select value={s} onChange={e => handleManeuverChange(i, e.target.value)}>
                              {["-1.5", "-1", "-0.5", "0", "+0.5", "+1", "+1.5"].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4>Penalty</h4>
                        {penaltyScores.map((s, i) => (
                          <div key={i} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>P{i + 1}:</span>
                            <input type="number" step="0.5" value={s} onChange={e => handlePenaltyChange(i, e.target.value)} style={{ width: '50px' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <h2 style={{ textAlign: 'right' }}>Celkové skóre: {isDq ? 'DQ' : calculateTotalScore()}</h2>
                  <button onClick={saveScore} style={{ ...styles.button, width: '100%', height: '60px' }}>ULOŽIT HODNOCENÍ</button>
                  <button onClick={() => setEvaluatingParticipant(null)} style={{ ...styles.button, background: '#ccc', width: '100%', marginTop: '10px' }}>ZAVŘÍT</button>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>DRAW</th>
                      <th style={styles.th}>Záda</th>
                      <th style={styles.th}>Jezdec / Kůň</th>
                      <th style={styles.th}>Stav</th>
                      <th style={styles.th}>Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {judgeStartList.map(r => (
                      <tr key={r.id}>
                        <td style={styles.td}>
                          <input type="number" defaultValue={r.draw_order} onBlur={e => updateParticipantDraw(r.id, e.target.value)} style={{ width: '50px', padding: '5px', fontWeight: 'bold' }} />
                        </td>
                        <td style={styles.td}><strong>{r.start_number}</strong></td>
                        <td style={styles.td}>{r.rider_name}<br /><small>{r.horse_name}</small></td>
                        <td style={styles.td}>
                          {scoresheets.some(s => s.participant_id === r.id) ? '✅ Hotovo' : '⏳ Čeká'}
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => openScoresheet(r)} style={styles.secondaryButton}>Hodnotit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* SPÍKR PANEL */}
          {(userRole === 'speaker' || userRole === 'superadmin') && (
            <div style={styles.card}>
              <h2>🎙️ Pohled Hlasatele</h2>
              {speakerDiscipline ? (
                <div>
                  <h3 style={{ textAlign: 'center', background: '#3e2723', color: '#fff', padding: '10px', borderRadius: '8px' }}>AKTIVNÍ: {speakerDiscipline}</h3>
                  <table style={{ ...styles.table, fontSize: '1.2rem' }}>
                    <tbody>
                      {speakerStartList.map(r => {
                        const sc = scoresheets.find(s => s.participant_id === r.id);
                        return (
                          <tr key={r.id} style={{ borderBottom: '2px solid #ddd' }}>
                            <td style={{ padding: '15px' }}>{r.draw_order}.</td>
                            <td style={{ padding: '15px', fontWeight: 'bold', fontSize: '1.5rem' }}>{r.start_number}</td>
                            <td style={{ padding: '15px' }}>{r.rider_name}<br /><small>{r.horse_name}</small></td>
                            <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                              {sc ? (sc.is_dq ? <span style={{ color: 'red' }}>DQ</span> : `${sc.total_score} b.`) : '---'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ textAlign: 'center', padding: '50px' }}>Čekám na zahájení disciplíny rozhodčím...</p>}
            </div>
          )}

          {/* ADMIN PANEL */}
          {(userRole === 'admin' || userRole === 'superadmin') && !evaluatingParticipant && (
            <div className="no-print">
              <div style={styles.card}>
                <h3>⚙️ Administrace Závodů</h3>
                <form onSubmit={handleCreateEvent} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input style={styles.input} placeholder="Název závodů" value={newEventName} onChange={e => setNewEventName(e.target.value)} required />
                  <input style={styles.input} type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required />
                  <button type="submit" style={styles.button}>VYPSAT</button>
                </form>

                <div style={styles.adminSection}>
                  <h4>Ceník a Úlohy</h4>
                  <form onSubmit={handleCreatePricing} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input style={styles.input} placeholder="Disciplína" value={newDiscName} onChange={e => setNewDiscName(e.target.value)} required />
                    <input style={styles.input} type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} required />
                    <input type="file" onChange={e => setPatternFile(e.target.files[0])} />
                    <button type="submit" style={{ ...styles.button, background: '#2e7d32' }}>PŘIDAT</button>
                  </form>
                  <table style={styles.table}>
                    <tbody>
                      {pricing.map(p => (
                        <tr key={p.id}>
                          <td>{p.discipline_name}</td>
                          <td>{p.price} Kč</td>
                          <td>{p.pattern_url && <a href={p.pattern_url} target="_blank">📄 Úloha</a>}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => handleDeletePricing(p.id, p.discipline_name)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}>Smazat</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>Aktivní Události</h4>
                  {events.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px', alignItems: 'center' }}>
                      <span><strong>{ev.name}</strong> ({new Date(ev.event_date).toLocaleDateString()})</span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{ ...styles.secondaryButton, background: ev.is_locked ? '#ffb300' : '#4caf50' }}>{ev.is_locked ? '🔓 Odemknout' : '🔒 Uzamknout'}</button>
                        <button onClick={() => handleEndCompetitionAndSendResults(ev.id)} style={{ ...styles.button, background: '#1a237e' }}>🏆 Výsledky na TG</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { width: 100% !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  button: { background: '#5d4037', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  secondaryButton: { background: 'transparent', border: '1px solid #5d4037', color: '#5d4037', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee', background: '#fafafa' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  adminSection: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: '#fdfdfd' },
  loader: { border: '8px solid #f3f3f3', borderTop: '8px solid #5d4037', borderRadius: '50%', width: '60px', height: '60px', animation: 'spin 2s linear infinite', margin: '0 auto' }
};
