/* eslint-disable */
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import React from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

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
    console.log("Audio alert blocked by browser. User interaction needed.");
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
    console.error('Chyba při odesílání na náš server:', err);
  }
};

async function generateHash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_PROPOSITIONS = `Pořadatel: JK Sobotka – Pavla Koklesová
Rozhodčí: Pavla Doubravová
Ředitel akce: Pavla Koklesová
Sekretář závodů: Leona Plocková (plockovaleona@seznam.cz)

Místo konání: Sobotka – kolbiště a jízdárna pod Humprechtem (Adresa: Pod Humprechtem 507 43)
Zdravotní služba: Červený kříž
Uzávěrka přihlášek: 36h. před zahájením
Kontakty: 721 456 049, 702 165 991

Informace o akci a Poplatky:
Sledujte naše oficiální informační kanály na internetu a událost Westernové hobby závody pod Humprechtem.
- 300 Kč (kategorie Open, Hříbata)
- 250 Kč (kategorie Mládež, Děti)

Časový plán:
Veterinární přejímka bude probíhat od 8:00 do 9:00. Předpokládaný čas zahájení akce je cca 9:00. Čas je pouze orientační a může se změnit.

Veterinární podmínky:
Kůň musí být v imunitě proti influenze (chřipce) koní. Kůň starší 12 měsíců musí být laboratorně vyšetřen s negativním výsledkem na infekční anemii, vyšetření nesmí být starší 12 měsíců. 

Kategorie:
1. Open – otevřená kategorie pro všechny.
2. Mládež – rozdělena na: Začátečníci (Rookies) do 14 let a Pokročilí (Advanced) do 18 let.
3. Děti – do 12 let včetně – s vodičem nebo bez vodiče.
4. Hříbata – do 3 let včetně.

Výstroj:
Výstroj může být anglická i westernová. Pro kategorie mládež a děti je bezpečnostní přilba povinná.`;

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
  const [allHorses, setAllHorses] = useState([]);
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
  
  const [riderAgeCategory, setRiderAgeCategory] = useState('18+');
  const [horseBirthYear, setHorseBirthYear] = useState('');
  const [horseIdNumber, setHorseIdNumber] = useState('');
  const [patternFile, setPatternFile] = useState(null);

  const [editingPricingId, setEditingPricingId] = useState(null);
  const [editDiscPrice, setEditDiscPrice] = useState('');
  const [editPatternFile, setEditPatternFile] = useState(null);
  
  const [editingHorseId, setEditingHorseId] = useState(null);
  const [editHorseName, setEditHorseName] = useState('');
  const [editHorseYear, setEditHorseYear] = useState('');
  const [editHorseIdNum, setEditHorseIdNum] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [playerTab, setPlayerTab] = useState('main'); 

  // ADMIN STAVY
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newStartNumFrom, setNewStartNumFrom] = useState('1'); 
  const [newStartNumTo, setNewStartNumTo] = useState('100'); 
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscPrice, setNewDiscPrice] = useState('');
  const [adminSelectedEvent, setAdminSelectedEvent] = useState(''); 
  const [adminTab, setAdminTab] = useState('settings'); 
  const [manualTgMessage, setManualTgMessage] = useState('');
  
  const [editingEventPropsId, setEditingEventPropsId] = useState(null);
  const [editEventPropsText, setEditEventPropsText] = useState('');
  const [editEventPatternsUrl, setEditEventPatternsUrl] = useState(''); 
  const [rulesSelectedEvent, setRulesSelectedEvent] = useState('');

  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountRole, setNewAccountRole] = useState('judge');

  // ROZHODČÍ STAVY
  const [judgeEvent, setJudgeEvent] = useState('');
  const [judgeDiscipline, setJudgeDiscipline] = useState('');
  const [evaluatingParticipant, setEvaluatingParticipant] = useState(null);
  const [maneuversInputString, setManeuversInputString] = useState('');
  const [maneuverScores, setManeuverScores] = useState([]);
  const [penaltyScores, setPenaltyScores] = useState([]);
  const [maneuverNames, setManeuverNames] = useState([]); 
  const [disciplineManeuverNames, setDisciplineManeuverNames] = useState({}); 
  const [showJudgeHints, setShowJudgeHints] = useState(false);
  const [actualJudgeName, setActualJudgeName] = useState(''); 
  const [isDq, setIsDq] = useState(false); 

  // SPÍKR STAVY
  const [showSpeakerResults, setShowSpeakerResults] = useState(false); 
  const [speakerResultDiscipline, setSpeakerResultDiscipline] = useState(''); // Nový stav pro roletku Spíkra

  const [simulatedRole, setSimulatedRole] = useState(null);
  const [printMode, setPrintMode] = useState(''); 
  const lastInternalMsgRef = useRef('');

  // FILTRACE CENÍKU PODLE VĚKU + ABECEDA
  const filteredPricing = pricing.filter(p => {
    if (riderAgeCategory === '18+') {
      const n = p.discipline_name.toLowerCase();
      return !n.includes('mládež') && !n.includes('děti') && !n.includes('rookies');
    }
    return true; 
  }).sort((a, b) => a.discipline_name.localeCompare(b.discipline_name, 'cs'));
  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
      if (evts) {
        setEvents(evts);
        const currentRole = profile?.role || simulatedRole;
        if (['admin', 'superadmin', 'judge', 'speaker'].includes(currentRole)) {
          const activeEv = evts.find(e => e.id === adminSelectedEvent || e.id === judgeEvent) || evts.find(e => e.is_locked) || evts[0];
          if (activeEv && activeEv.internal_message && activeEv.internal_message !== lastInternalMsgRef.current) {
            if (lastInternalMsgRef.current !== '') playAlert(); 
            lastInternalMsgRef.current = activeEv.internal_message;
          }
        }
      }

      if (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'judge' || profile?.role === 'speaker') {
        const { data: regs } = await supabase.from('race_participants').select('*');
        if (regs) setAllRegistrations(regs);

        const { data: scores } = await supabase.from('scoresheets').select('*').order('scored_at', { ascending: false });
        if (scores) {
          setScoresheets(scores);
        }
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [profile, adminSelectedEvent, judgeEvent, simulatedRole]);

  const unlockAudio = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();
      } catch(e) {}
  };

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

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker') {
          const { data: allH } = await supabase.from('horses').select('*');
          setAllHorses(allH || []);
        }

        const { data: evts } = await supabase.from('events').select('*').order('event_date', { ascending: false });
        setEvents(evts || []);

        const { data: prices } = await supabase.from('pricing').select('*').order('id');
        setPricing(prices || []);

        if (prof?.role === 'admin' || prof?.role === 'superadmin' || prof?.role === 'judge' || prof?.role === 'speaker') {
          const { data: regs } = await supabase.from('race_participants').select('*');
          setAllRegistrations(regs || []);
          const { data: scores } = await supabase.from('scoresheets').select('*').order('scored_at', { ascending: false });
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
      else window.location.reload();
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
      city: profile.city,
      birth_date: profile.birth_date
    }).eq('id', user.id);
    
    if (error) alert(error.message);
    else { 
      await logSystemAction('Úprava profilu', { name: profile.full_name });
      alert('Profil uložen!'); 
      setEditMode(false); 
    }
  };

  const startEditingHorse = (h) => {
    setEditingHorseId(h.id);
    setEditHorseName(h.name);
    setEditHorseYear(h.birth_year || '');
    setEditHorseIdNum(h.horse_id_number || '');
  };

  const saveEditedHorse = async (id) => {
    const { error } = await supabase.from('horses').update({ 
      name: editHorseName, 
      birth_year: editHorseYear, 
      horse_id_number: editHorseIdNum 
    }).eq('id', id);
    if (error) alert(error.message);
    else {
      setEditingHorseId(null);
      checkUser();
    }
  };

  const handleDeleteHorse = async (id, name) => {
    const inUse = allRegistrations.some(r => r.horse_name === name);
    if (inUse) return alert("Tohoto koně nelze smazat, protože je již přihlášen na závody!");
    if (confirm(`Opravdu chcete koně ${name} smazat z historie?`)) {
      const { error } = await supabase.from('horses').delete().eq('id', id);
      if (error) alert(error.message);
      else checkUser();
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
    let targetEventId = eventId;
    let targetMessage = currentMessage;

    if (!targetEventId) {
      const fallbackEvent = events.find(e => e.is_locked) || events[0];
      if (fallbackEvent) {
        targetEventId = fallbackEvent.id;
        targetMessage = fallbackEvent.internal_message;
      } else {
        alert("⚠️ V systému zatím není žádný závod, ke kterému by se zpráva dala přiřadit.");
        return;
      }
    }

    const msg = prompt("Zadejte TAJNOU zprávu pro štáb (vidí ji Admin, Rozhodčí, Spíkr). Smazáním textu zprávu zrušíte:", targetMessage || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ internal_message: msg }).eq('id', targetEventId);
      if (error) alert(error.message);
      else checkUser(); 
    }
  };
  const handleRaceRegistration = async () => {
    setLoading(true);

    if (!profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city) {
      alert("Než se přihlásíte na závod, musíte mít kompletně vyplněný profil!");
      setLoading(false);
      return;
    }

    if (!selectedEvent || !selectedHorse || selectedDisciplines.length === 0 || !customRiderName.trim()) {
      alert("Vyplňte prosím jméno jezdce, vyberte závod, koně a aspoň jednu disciplínu.");
      setLoading(false);
      return;
    }

    const finalRiderName = customRiderName.trim();

    let finalHorseName = selectedHorse;
    if (selectedHorse === 'new') {
      if (!newHorseName.trim()) {
        alert("Napište jméno nového koně!");
        setLoading(false);
        return;
      }
      const { data: newHorse, error: horseErr } = await supabase.from('horses')
        .insert([{ owner_id: user.id, name: newHorseName.trim(), birth_year: horseBirthYear, horse_id_number: horseIdNumber }])
        .select().single();
      if (horseErr) {
        alert("Chyba při ukládání koně: " + horseErr.message);
        setLoading(false);
        return;
      }
      finalHorseName = newHorse.name;
    }

    const selectedEventObj = events.find(e => e.id === selectedEvent);
    const fromNum = selectedEventObj?.start_num_from || 1;
    const toNum = selectedEventObj?.start_num_to || 200;
    const capacity = toNum - fromNum + 1;

    const { data: freshRegs } = await supabase.from('race_participants').select('start_number, rider_name, horse_name').eq('event_id', selectedEvent);
    const existingMatch = freshRegs?.find(r => r.rider_name?.trim().toLowerCase() === finalRiderName.toLowerCase() && r.horse_name?.trim().toLowerCase() === finalHorseName.toLowerCase());

    let assignedNumber;
    if (existingMatch) {
      assignedNumber = existingMatch.start_number; 
    } else {
      const takenNumbers = freshRegs?.map(t => t.start_number) || [];
      const available = Array.from({ length: capacity }, (_, i) => i + fromNum).filter(n => !takenNumbers.includes(n));
      if (available.length === 0) {
        alert("Kapacita čísel pro tento závod je vyčerpána!");
        setLoading(false);
        return;
      }
      assignedNumber = available[Math.floor(Math.random() * available.length)];
    }

    const registrationData = selectedDisciplines.map((d) => {
      return {
        user_id: user.id,
        event_id: selectedEvent,
        rider_name: finalRiderName,
        age_category: riderAgeCategory,
        horse_name: finalHorseName,
        discipline: d.discipline_name,
        start_number: assignedNumber,
        draw_order: null, 
        price: d.price,
        is_paid: false,
        payment_note: ''
      };
    });

    const { error } = await supabase.from('race_participants').insert(registrationData);
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      await logSystemAction('Odeslána přihláška na závod', { horse: finalHorseName, rider: finalRiderName, disciplines: selectedDisciplines.map(d=>d.discipline_name) });
      
      try {
        const userEmail = profile?.email || user?.email;
        if (userEmail) {
          await fetch('/api/send-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              eventName: selectedEventObj.name,
              riderName: finalRiderName,
              horseName: finalHorseName,
              startNumber: assignedNumber,
              disciplines: selectedDisciplines.map(d => d.discipline_name),
              totalPrice: selectedDisciplines.reduce((sum, d) => sum + d.price, 0)
            })
          });
        }
      } catch (mailErr) {
        console.error('Chyba při odesílání e-mailu:', mailErr);
      }

      alert(`Přihláška odeslána! Startovní číslo: ${assignedNumber}.`);
      window.location.reload();
    }
  };

  const handleCancelRegistration = async (id) => {
    if (confirm("Opravdu chcete zrušit tuto přihlášku? Startovní číslo se uvolní pro ostatní.")) {
      await supabase.from('race_participants').delete().eq('id', id);
      window.location.reload();
    }
  };
  
  const updateParticipantDraw = async (id, newDraw) => {
    const val = newDraw ? parseInt(newDraw) : null;
    await supabase.from('race_participants').update({ draw_order: val }).eq('id', id);
    checkUser();
  };

  const handleJudgeDisciplineChange = async (eventId, discName) => {
    setJudgeDiscipline(discName);
    setSpeakerFrozenDiscipline(null); // Reset mrazáku spíkra při změně disciplíny
    await supabase.from('events').update({ active_discipline: discName }).eq('id', eventId);
    
    if(discName && disciplineManeuverNames[discName]) {
        const names = disciplineManeuverNames[discName];
        setManeuversInputString(names.filter(n => n.trim() !== '').join(', '));
    } else {
        setManeuversInputString('');
    }
  };

  const applyManeuversFromString = () => {
      const arr = maneuversInputString.split(',').map(s => s.trim()).filter(s => s !== '');
      if (arr.length > 20) {
          alert('Maximální počet manévrů je 20!');
          return;
      }
      const newNames = Array(20).fill('');
      arr.forEach((n, i) => { newNames[i] = n; });
      setDisciplineManeuverNames(prev => ({...prev, [judgeDiscipline]: newNames}));
      alert(`Uloženo ${arr.length} manévrů pro disciplínu ${judgeDiscipline}.`);
  };

  const announceDisciplineEnd = async (discName) => {
    if(confirm(`Oznámit konec disciplíny ${discName}?`)){
        await sendTelegramMessage(`🏁 <b>DISCIPLÍNA UZAVŘENA</b>\n\nPrávě bylo dokončeno hodnocení disciplíny <b>${discName}</b>. Kompletní výsledky budou k dispozici po ukončení závodů.`);
        alert('Odesláno!');
    }
  };

  const openScoresheet = (participant) => {
    setEvaluatingParticipant(participant);
    
    const existingScore = scoresheets.find(s => s.participant_id === participant.id);
    if (existingScore) {
      setManeuverScores(existingScore.score_data.maneuvers || Array(20).fill(0));
      setPenaltyScores(existingScore.score_data.penalties || Array(20).fill(0));
      setIsDq(existingScore.score_data.is_dq || false);
      if (existingScore.score_data.maneuverNames) {
        setManeuverNames(existingScore.score_data.maneuverNames);
      }
    } else {
      setManeuverScores(Array(20).fill(0));
      setPenaltyScores(Array(20).fill(0));
      setIsDq(false);
      
      if (disciplineManeuverNames[participant.discipline]) {
        setManeuverNames(disciplineManeuverNames[participant.discipline]);
      } else {
        setManeuverNames(Array(20).fill(''));
      }
    }
  };

  const handleManeuverChange = (index, value) => {
    const newScores = [...maneuverScores];
    newScores[index] = Number(value);
    setManeuverScores(newScores);
  };

  const handleManeuverNameChange = (index, value) => {
    const newNames = [...maneuverNames];
    newNames[index] = value;
    setManeuverNames(newNames);
  };

  const handlePenaltyChange = (index, value) => {
    const newPenalties = [...penaltyScores];
    newPenalties[index] = value === '' ? 0 : Number(value); 
    setPenaltyScores(newPenalties);
  };

  const calculateTotalScore = () => {
    const baseScore = 70;
    const maneuversTotal = maneuverScores.reduce((acc, val) => Number(acc) + Number(val), 0);
    const penaltiesTotal = penaltyScores.reduce((acc, val) => Number(acc) + Number(val), 0); 
    return baseScore + maneuversTotal - penaltiesTotal;
  };

  const saveScore = async () => {
    const total = isDq ? 0 : calculateTotalScore();
    const scoreData = { maneuvers: maneuverScores, penalties: penaltyScores, maneuverNames: maneuverNames, is_dq: isDq };
    
    setDisciplineManeuverNames(prev => ({...prev, [evaluatingParticipant.discipline]: maneuverNames}));

    const timestamp = new Date().toISOString();
    const judgeName = actualJudgeName.trim() || profile?.full_name || 'Neznámý rozhodčí';
    
    const dataToSign = `${evaluatingParticipant.id}-${judgeName}-${timestamp}-${total}-${JSON.stringify(scoreData)}`;
    const hash = await generateHash(dataToSign);

    await supabase.from('scoresheets').delete().eq('participant_id', evaluatingParticipant.id);

    const { error } = await supabase.from('scoresheets').insert({
      participant_id: evaluatingParticipant.id,
      judge_id: user.id,
      judge_name: judgeName,
      scored_at: timestamp,
      signature_hash: hash,
      score_data: scoreData,
      total_score: total
    });

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
    } else {
      alert('Hodnocení bylo úspěšně uloženo a podepsáno!');
      setEvaluatingParticipant(null);
      checkUser(); 
    }
  };

  const renderPrintableScoresheets = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    return (
      <div className="print-area">
        {disciplines.length === 0 ? (
          <p className="no-print" style={{color: '#666'}}>Zatím nejsou k dispozici žádní jezdci.</p>
        ) : (
          disciplines.map(discipline => {
            const ridersInDiscipline = allRegistrations.filter(r => r.event_id === eventId && r.discipline === discipline).sort((a, b) => a.draw_order - b.draw_order);
            if(ridersInDiscipline.length === 0) return null;

            const scoredRiders = ridersInDiscipline.filter(r => scoresheets.some(s => s.participant_id === r.id));
            const signatureObj = scoredRiders.length > 0 ? scoresheets.find(s => s.participant_id === scoredRiders[0].id) : null;
            let currentManeuverNames = disciplineManeuverNames[discipline] || Array(20).fill('');
            if (signatureObj?.score_data?.maneuverNames) {
               currentManeuverNames = signatureObj.score_data.maneuverNames;
            }

            let activeCount = 0;
            for(let i=0; i<20; i++){
               if(currentManeuverNames[i] && currentManeuverNames[i].trim() !== '') activeCount = i + 1;
            }
            if(activeCount === 0) activeCount = 10; 

            const printNames = currentManeuverNames.slice(0, activeCount);
            const cols = Array.from({length: activeCount}, (_, i) => i);
            
            return (
              <div key={discipline} className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px solid black', paddingBottom: '10px' }}>
                  <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.8rem', color: 'black' }}>{eventObj.name}</h2>
                  <h3 style={{ margin: '5px 0 0 0', color: 'black', fontSize: '1.4rem' }}>SCORESHEET: {discipline}</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                    <strong style={{fontSize: '1.2rem', color: 'black'}}>Úloha (Pattern):</strong>
                    <input type="text" className="print-input" placeholder="Zadejte název úlohy" style={{ border: 'none', borderBottom: '2px dotted black', fontSize: '1.2rem', width: '300px', background: 'transparent', textAlign: 'center', color: 'black' }} />
                  </div>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem', border: '2px solid black' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>DRAW</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '50px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>EXH#</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'left', minWidth: '180px', background: '#e0e0e0', color: 'black' }}>JEZDEC / KŮŇ</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '6px', width: '40px', fontSize: '0.8rem', background: '#e0e0e0', color: 'black' }}></th>
                      <th colSpan={activeCount} style={{ border: '2px solid black', padding: '10px', textAlign: 'center', background: '#eeeeee', color: 'black' }}>MANÉVRY</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '80px', textAlign: 'center', background: '#e0e0e0', color: 'black' }}>PENALTY<br/>TOTAL</th>
                      <th rowSpan="2" style={{ border: '2px solid black', padding: '10px', width: '90px', textAlign: 'center', fontSize: '1.2rem', background: '#e0e0e0', color: 'black' }}>FINAL<br/>SCORE</th>
                    </tr>
                    <tr>
                      {printNames.map((name, i) => (
                        <th key={i} style={{ border: '2px solid black', padding: '8px', width: '45px', textAlign: 'center', background: '#eeeeee', fontSize: '0.8rem', color: 'black' }}>{name || i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ridersInDiscipline.map(r => {
                      const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                      const isDqResult = scoreObj?.score_data?.is_dq;
                      const pTotal = scoreObj && !isDqResult ? scoreObj.score_data.penalties.reduce((a,b)=> Number(a) + Number(b), 0) : '';
                      return (
                        <React.Fragment key={r.id}>
                          <tr>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'black' }}>{r.draw_order || ''}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: '900', fontSize: '1.3rem', color: 'black' }}>{r.start_number}</td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', borderRight: '2px solid black' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'black' }}>{r.rider_name}</div>
                              <div style={{ color: '#333', fontStyle: 'italic' }}>{r.horse_name}</div>
                            </td>
                            <td style={{ border: '1px solid black', borderRight: '2px solid black', borderBottom: '1px solid #aaa', padding: '6px', fontSize: '0.75rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>PENALTY</td>
                            {cols.map(i => (
                              <td key={`p-${i}`} style={{ border: '1px solid black', borderBottom: '1px solid #aaa', padding: '8px', textAlign: 'center', color: 'black', fontWeight: 'bold', height: '30px' }}>
                                {scoreObj && !isDqResult && scoreObj.score_data.penalties[i] > 0 ? `-${scoreObj.score_data.penalties[i]}` : ''}
                              </td>
                            ))}
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', color: 'black', fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {pTotal > 0 ? `-${pTotal}` : ''}
                            </td>
                            <td rowSpan="2" style={{ border: '2px solid black', padding: '10px', textAlign: 'center', fontWeight: '900', fontSize: '1.5rem', color: 'black' }}>
                              {isDqResult ? 'DQ' : (scoreObj ? scoreObj.total_score : '')}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid black', borderRight: '2px solid black', padding: '6px', fontSize: '0.75rem', background: '#f5f5f5', textAlign: 'center', color: 'black', fontWeight: 'bold' }}>SCORE</td>
                            {cols.map(i => (
                              <td key={`s-${i}`} style={{ border: '1px solid black', padding: '8px', textAlign: 'center', height: '30px', color: 'black' }}>
                                {scoreObj && !isDqResult && scoreObj.score_data.maneuvers[i] !== 0 ? (scoreObj.score_data.maneuvers[i] > 0 ? `+${scoreObj.score_data.maneuvers[i]}` : scoreObj.score_data.maneuvers[i]) : (scoreObj && !isDqResult ? '0' : '')}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '3px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'black' }}><strong>Podpis rozhodčího / Judge's signature:</strong></p>
                    <h3 style={{ margin: '10px 0 5px 0', color: 'black' }}>{signatureObj ? signatureObj.judge_name : '____________________________________'}</h3>
                    <p style={{ margin: '0', fontSize: '0.9rem', color: 'black' }}>Dne: {signatureObj ? new Date(signatureObj.scored_at).toLocaleString('cs-CZ') : '___________________'}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    );
  };

  const renderVeterinaryList = (eventId) => {
    const eventObj = events.find(e => e.id === eventId);
    if (!eventObj) return null;

    const eventRegs = allRegistrations.filter(r => r.event_id === eventId);
    const uniqueHorsesMap = new Map();
    
    eventRegs.forEach(r => {
      if (!uniqueHorsesMap.has(r.horse_name)) {
        const hDetail = allHorses.find(h => h.name === r.horse_name);
        uniqueHorsesMap.set(r.horse_name, {
           startNumber: r.start_number,
           horseName: r.horse_name,
           riderName: r.rider_name,
           birthYear: hDetail?.birth_year || '-',
           idNum: hDetail?.horse_id_number || '-'
        });
      }
    });

    const sortedHorses = Array.from(uniqueHorsesMap.values()).sort((a, b) => a.horseName.localeCompare(b.horseName));

    return (
      <div className="print-area">
         <div className="page-break" style={{ position: 'relative', minHeight: '95vh', paddingBottom: '70px', marginBottom: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid black', paddingBottom: '15px' }}>
              <h2 style={{ margin: '0', textTransform: 'uppercase', fontSize: '1.8rem', color: 'black' }}>{eventObj.name}</h2>
              <h3 style={{ margin: '5px 0 0 0', color: 'black', fontSize: '1.4rem' }}>VETERINÁRNÍ PŘEJÍMKA</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1rem', border: '2px solid black' }}>
               <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'center', width: '80px', color: 'black'}}>St. č.</th>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'left', color: 'black'}}>Jméno koně</th>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'center', width: '100px', color: 'black'}}>Rok nar.</th>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'center', color: 'black'}}>Průkaz / ID</th>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'left', color: 'black'}}>Jezdec</th>
                     <th style={{border: '2px solid black', padding: '12px', textAlign: 'center', width: '180px', color: 'black'}}>Kontrola<br/>(Krev/Očkování)</th>
                  </tr>
               </thead>
               <tbody>
                  {sortedHorses.map((h, i) => (
                     <tr key={i}>
                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', fontWeight: '900', fontSize: '1.2rem', color: 'black'}}>{h.startNumber}</td>
                        <td style={{border: '1px solid black', padding: '12px', fontWeight: 'bold', color: 'black'}}>{h.horseName}</td>
                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', color: 'black'}}>{h.birthYear}</td>
                        <td style={{border: '1px solid black', padding: '12px', textAlign: 'center', color: 'black'}}>{h.idNum}</td>
                        <td style={{border: '1px solid black', padding: '12px', color: 'black'}}>{h.riderName}</td>
                        <td style={{border: '1px solid black', padding: '12px'}}></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    )
  };
if (loading) return <div style={styles.loader}>Načítám Pod Humprechtem...</div>

  const effectiveRole = simulatedRole || profile?.role || 'player';
  const lockedEvent = events.find(ev => ev.is_locked);
  
  // ROZHODČÍ: Aktivní disciplíny a listina
  const activeJudgeDisciplines = judgeEvent ? [...new Set(allRegistrations.filter(r => r.event_id === judgeEvent).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs')) : [];
  const judgeStartList = judgeEvent && judgeDiscipline ? allRegistrations.filter(r => r.event_id === judgeEvent && r.discipline === judgeDiscipline).sort((a, b) => {
    if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
    if (a.draw_order !== null) return -1;
    if (b.draw_order !== null) return 1;
    return a.start_number - b.start_number;
  }) : [];

  // SPÍKR: Proměnné
  const speakerEventId = lockedEvent?.id;
  const speakerLiveDiscipline = lockedEvent?.active_discipline; // Co má zrovna rozkliknuté rozhodčí
  const allSpeakerDisciplines = speakerEventId ? [...new Set(allRegistrations.filter(r => r.event_id === speakerEventId).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs')) : [];
  
  const speakerLiveList = speakerEventId && speakerLiveDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerLiveDiscipline).sort((a, b) => {
    if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
    if (a.draw_order !== null) return -1;
    if (b.draw_order !== null) return 1;
    return a.start_number - b.start_number;
  }) : [];

  const speakerResultList = speakerEventId && speakerResultDiscipline ? allRegistrations.filter(r => r.event_id === speakerEventId && r.discipline === speakerResultDiscipline) : [];

  const rulesData = rulesSelectedEvent ? events.find(e => e.id === rulesSelectedEvent)?.propositions : null;

  if (currentTab === 'rules' && user) {
    return (
      <div style={styles.container}>
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Zpět do Aplikace</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: '#ffb300', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
        
        <div className="no-print" style={styles.card}>
          <h2 style={{color: '#5d4037', textAlign: 'center', marginTop: 0}}>PROPOZICE A PRAVIDLA</h2>
          
          <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '30px', textAlign: 'center'}}>
            <label style={{fontWeight: 'bold', marginRight: '10px'}}>Zobrazit propozice pro závod: </label>
            <select value={rulesSelectedEvent} onChange={e => setRulesSelectedEvent(e.target.value)} style={{...styles.inputSmall, width: '300px', display: 'inline-block'}}>
              <option value="">-- Vyberte závod --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>

          {rulesSelectedEvent ? (
            <div style={{fontSize: '1.1rem', whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>
              {events.find(e => e.id === rulesSelectedEvent)?.patterns_url && (
                <div style={{marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9'}}>
                  <strong>🔗 Odkaz na úlohy (Patterny): </strong>
                  <a href={events.find(e => e.id === rulesSelectedEvent).patterns_url} target="_blank" rel="noopener noreferrer" style={{color: '#0288d1', fontWeight: 'bold', textDecoration: 'underline'}}>Otevřít úlohy ke stažení</a>
                </div>
              )}
              {rulesData || 'Pro tento závod nejsou zadány žádné propozice.'}
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#666', fontSize: '1.2rem'}}>Prosím, vyberte závod z nabídky výše.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} onClick={unlockAudio}>
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
          .startlist-table th, .startlist-table td { border: 2px solid black !important; padding: 8px !important; }
        }
      `}</style>

      {user && (
        <div className="no-print" style={{ display: 'flex', background: '#3e2723', padding: '10px 20px', gap: '15px', marginBottom: '20px', borderRadius: '8px' }}>
          <button onClick={() => setCurrentTab('app')} style={{ background: currentTab === 'app' ? '#ffb300' : 'transparent', color: currentTab === 'app' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>🐎 Závodní Portál</button>
          <button onClick={() => setCurrentTab('rules')} style={{ background: currentTab === 'rules' ? '#ffb300' : 'transparent', color: currentTab === 'rules' ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>📜 Propozice a Pravidla</button>
        </div>
      )}

      {user && ['admin', 'superadmin', 'judge', 'speaker'].includes(effectiveRole) && (
        <div className="no-print" style={{ backgroundColor: '#fff9c4', border: '4px solid #fbc02d', borderRadius: '12px', padding: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{flex: 1}}>
            <strong style={{color: '#f57f17', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px'}}>📳 ŽLUTÁ VYSÍLAČKA (Zprávy pro štáb)</strong>
            <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#000'}}>
              {events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.internal_message || "Ticho na lince..."}
            </span>
          </div>
          <button onClick={() => handleUpdateInternalMessage(events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.id, events.find(e => e.is_locked || e.id === adminSelectedEvent || e.id === judgeEvent)?.internal_message)} style={{...styles.btnSave, background: '#333'}}>Poslat zprávu štábu</button>
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
            <button onClick={() => setSimulatedRole('judge')} style={effectiveRole === 'judge' ? styles.activeTab : styles.tab}>Rozhodčí Pohled</button>
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
        <div className="no-print" style={styles.card}>
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
      ) : (
        <div style={effectiveRole === 'player' ? {maxWidth: '900px', margin: '0 auto'} : styles.mainGrid}>
          
          {effectiveRole !== 'player' && (
            <div className="no-print" style={styles.sideCard}>
              <h3>Můj Profil</h3>
              {editMode ? (
                <form onSubmit={updateProfile}>
                  <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                  <input style={styles.inputSmall} type="email" placeholder="Email" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                  <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} required/>
                  <input style={styles.inputSmall} placeholder="Číslo hospodářství" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                  <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} required/>
                  <input style={styles.inputSmall} type="date" title="Datum narození" value={profile?.birth_date || ''} onChange={e => setProfile({...profile, birth_date: e.target.value})} required/>
                  <button type="submit" style={styles.btnSave}>Uložit profil</button>
                  <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px'}}>Zrušit</button>
                </form>
              ) : (
                <div>
                  <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                  <p>E-mail: {profile?.email || user?.email}</p>
                  <p>Telefon: {profile?.phone || 'Nevyplněno'}</p>
                  <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                  <p>Obec: {profile?.city || 'Nevyplněno'}</p>
                  <p>Narození: {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('cs-CZ') : 'Nevyplněno'}</p>
                  {( !profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city ) && (
                    <p style={{color: '#e57373', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Profil není kompletní.</p>
                  )}
                  <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                  <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
                </div>
              )}
            </div>
          )}

          <div className="print-area" style={styles.card}>
            {(effectiveRole === 'admin' || effectiveRole === 'superadmin') && (
              <div>
                <div className="no-print" style={{marginBottom: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '10px'}}>
                  <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '5px'}}>
                    <button onClick={() => { setAdminSelectedEvent(''); setAdminTab('settings'); }} style={!adminSelectedEvent && adminTab === 'settings' ? styles.activeTab : styles.tab}>Nastavení Závodů</button>
                    {effectiveRole === 'superadmin' && (
                      <button onClick={() => { setAdminSelectedEvent(''); setAdminTab('accounts'); }} style={!adminSelectedEvent && adminTab === 'accounts' ? {...styles.activeTab, background: '#e65100'} : {...styles.tab, background: '#e65100'}}>Vytvořit Účet</button>
                    )}
                    <button onClick={() => { setAdminSelectedEvent(''); setAdminTab('telegram'); }} style={!adminSelectedEvent && adminTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Telegram</button>
                    {events.map(ev => (
                      <button key={ev.id} onClick={() => { setAdminSelectedEvent(ev.id); setAdminTab('detail'); }} style={adminSelectedEvent === ev.id ? styles.activeTab : styles.tab}>
                        Detail: {ev.name}
                      </button>
                    ))}
                  </div>
                </div>

                {!adminSelectedEvent && adminTab === 'settings' && (
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
                            <th style={{padding: '8px', textAlign: 'center'}}>Propozice</th>
                            <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(ev => (
                            <tr key={ev.id} style={{borderBottom: '1px solid #eee', background: ev.is_locked ? '#fff3e0' : 'transparent'}}>
                              <td style={{padding: '8px'}}><strong>{ev.name}</strong></td>
                              <td style={{padding: '8px'}}>{new Date(ev.event_date).toLocaleDateString('cs-CZ')}</td>
                              <td style={{padding: '8px'}}>{ev.start_num_from || 1} - {ev.start_num_to || 200}</td>
                              <td style={{padding: '8px', color: ev.is_locked ? '#e65100' : '#2e7d32', fontWeight: 'bold'}}>
                                {ev.is_locked ? 'Uzamčeno' : 'Otevřeno'}
                              </td>
                              <td style={{padding: '8px', textAlign: 'center'}}>
                                <button onClick={() => startEditingEventProps(ev)} style={{background: 'none', border: '1px solid #0277bd', color: '#0277bd', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px'}}>✏️ Edit</button>
                              </td>
                              <td style={{padding: '8px', textAlign: 'center'}}>
                                <button onClick={() => toggleEventLock(ev.id, ev.is_locked, ev.name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', marginRight: '10px'}}>
                                  {ev.is_locked ? 'Odemknout' : 'Uzamknout'}
                                </button>
                                <button onClick={() => handleDeleteEvent(ev.id, ev.name)} style={{background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold'}}>
                                  🗑️ Smazat
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {editingEventPropsId && (
                      <div style={{...styles.adminSection, border: '2px solid #0277bd', background: '#e3f2fd'}}>
                        <h4 style={{margin: '0 0 10px 0', color: '#0277bd'}}>Úprava propozic pro závod</h4>
                        <textarea 
                          value={editEventPropsText} 
                          onChange={e => setEditEventPropsText(e.target.value)} 
                          style={{...styles.input, height: '300px', fontFamily: 'monospace'}}
                        />
                        <input 
                           type="text" 
                           placeholder="Odkaz (URL) na stažení úloh" 
                           value={editEventPatternsUrl} 
                           onChange={e => setEditEventPatternsUrl(e.target.value)} 
                           style={{...styles.input, marginTop: '10px', border: '2px solid #0288d1'}} 
                        />
                        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                          <button onClick={() => saveEventProps(editingEventPropsId)} style={{...styles.btnSave, background: '#0277bd'}}>Uložit propozice a odkaz</button>
                          <button onClick={() => setEditingEventPropsId(null)} style={{...styles.btnOutline, marginTop: 0}}>Zrušit</button>
                        </div>
                      </div>
                    )}

                    <div style={styles.adminSection}>
                      <h4 style={{margin: '0 0 10px 0'}}>Ceník disciplín + Nahrání úlohy (PDF/JPG)</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                          <label style={{fontSize: '0.85rem'}}>Úloha:</label>
                          <input type="file" accept=".pdf,image/*" onChange={e => setPatternFile(e.target.files[0])} style={{...styles.inputSmall, width: 'auto'}} />
                        </div>
                        <button type="submit" style={styles.btnSave}>Přidat</button>
                      </form>

                      <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px'}}>
                        <table style={{width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse'}}>
                          <thead style={{position: 'sticky', top: 0, background: '#e0e0e0'}}>
                            <tr style={{textAlign: 'left'}}>
                              <th style={{padding: '10px'}}>Disciplína</th>
                              <th style={{padding: '10px', width: '80px'}}>Cena</th>
                              <th style={{padding: '10px', width: '80px', textAlign: 'center'}}>Úloha</th>
                              <th style={{padding: '10px', width: '120px', textAlign: 'center'}}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map(p => (
                              <tr key={p.id} style={{borderBottom: '1px solid #eee', background: editingPricingId === p.id ? '#fff9c4' : 'transparent'}}>
                                <td style={{padding: '10px'}}>{p.discipline_name}</td>
                                {editingPricingId === p.id ? (
                                  <>
                                    <td style={{padding: '10px'}}>
                                      <input type="number" value={editDiscPrice} onChange={e => setEditDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '70px'}} /> Kč
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <input type="file" accept=".pdf,image/*" onChange={e => setEditPatternFile(e.target.files[0])} style={{width: '130px', fontSize: '0.75rem'}} />
                                    </td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      <button onClick={() => handleSaveEditPricing(p.id, p.discipline_name)} style={{...styles.btnSave, padding: '5px 10px', marginRight: '5px'}}>Uložit</button>
                                      <button onClick={() => setEditingPricingId(null)} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{padding: '10px'}}><strong>{p.price} Kč</strong></td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      {p.pattern_url ? (
                                        <a href={p.pattern_url} target="_blank" rel="noreferrer" style={{color: '#0277bd'}}>Zobrazit</a>
                                      ) : '-'}
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
                      <p>Zde můžete vytvořit účet pro Hlasatele nebo Rozhodčího. Přístupy se odešlou na zadaný e-mail.</p>
                      <form onSubmit={handleCreateAccount} style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                        <input type="email" placeholder="E-mailová adresa" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)} style={styles.inputSmall} required/>
                        <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={styles.inputSmall}>
                          <option value="judge">Rozhodčí (Judge)</option>
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
                      <p>Tato zpráva se rozešle všem sledujícím.</p>
                      <input type="text" placeholder="Napište vzkaz pro jezdce..." value={manualTgMessage} onChange={e => setManualTgMessage(e.target.value)} style={{...styles.input, fontSize: '1.1rem', padding: '15px'}} />
                      <button onClick={sendManualTgMessage} style={{...styles.btnSave, background: '#0288d1', padding: '15px 30px', fontSize: '1.1rem', marginTop: '10px'}}>Odeslat Zprávu Nyní</button>
                    </div>
                  </div>
                )}

                {adminSelectedEvent && (
                  <div className={printMode ? 'print-area' : ''}>
                    <div className="no-print" style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
                       <button onClick={() => setAdminTab('detail')} style={adminTab === 'detail' ? styles.activeTab : styles.tab}>📋 Startky a Výsledky</button>
                       <button onClick={() => setAdminTab('cashier')} style={adminTab === 'cashier' ? {...styles.activeTab, background: '#8e24aa'} : {...styles.tab, background: '#8e24aa'}}>💰 Pokladna / Prezence</button>
                       <button onClick={() => setAdminTab('vet')} style={adminTab === 'vet' ? {...styles.activeTab, background: '#00897b'} : {...styles.tab, background: '#00897b'}}>🐴 Veterina</button>
                    </div>

                    {adminTab === 'detail' && (
                      <>
                        <div className="no-print" style={{marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                          <div>
                            <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán závodů (Vidí všichni):</strong>
                            <span style={{fontSize: '1rem'}}>{events.find(e => e.id === adminSelectedEvent)?.schedule || 'Plán nebyl zadán'}</span>
                          </div>
                          <button onClick={() => handleUpdateSchedule(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.schedule)} style={{...styles.btnOutline, margin: 0}}>Upravit plán</button>
                        </div>

                        <div className="no-print" style={{marginBottom: '20px', background: '#fff9c4', padding: '20px', borderRadius: '8px', border: '2px solid #fbc02d', textAlign: 'center'}}>
                          <h3 style={{margin: '0 0 10px 0', color: '#f57f17'}}>Konec závodů</h3>
                          <p style={{margin: '0 0 15px 0', color: '#555'}}>Tímto tlačítkem vygenerujete celkové výsledky a okamžitě je odešlete pro všechny sledující.</p>
                          <button onClick={() => handleEndCompetitionAndSendResults(adminSelectedEvent)} style={{...styles.btnSave, background: '#fbc02d', color: '#000', fontSize: '1.2rem', padding: '15px 30px'}}>🏆 Ukončit závody a vyhlásit výsledky</button>
                        </div>

                        <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'} style={styles.adminSection}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 className="no-print" style={{margin: 0}}>Kompletní startovní listina</h4>
                            <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                          </div>
                          
                          <div style={{overflowX: 'auto'}}>
                            {(() => {
                              const evRegs = allRegistrations.filter(r => r.event_id === adminSelectedEvent);
                              const evDisciplines = [...new Set(evRegs.map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));
                              
                              if (evDisciplines.length === 0) return <p>Žádné přihlášky.</p>;

                              return evDisciplines.map(disc => {
                                const riders = evRegs.filter(r => r.discipline === disc).sort((a, b) => {
                                  if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
                                  if (a.draw_order !== null) return -1;
                                  if (b.draw_order !== null) return 1;
                                  return a.start_number - b.start_number;
                                });
                                return (
                                  <div key={disc} style={{marginBottom: '30px'}} className="page-break">
                                    <h2 style={{borderBottom: '3px solid #5d4037', color: '#5d4037', paddingBottom: '10px', textTransform: 'uppercase'}}>{disc}</h2>
                                    <table className="startlist-table" style={{width: '100%', fontSize: '1rem', borderCollapse: 'collapse', border: '2px solid black'}}>
                                      <thead>
                                        <tr style={{background: '#eee', textAlign: 'left'}}>
                                          <th style={{padding: '8px', width: '60px', border: '2px solid black'}}>Draw</th>
                                          <th style={{padding: '8px', width: '60px', border: '2px solid black'}}>Číslo</th>
                                          <th style={{padding: '8px', border: '2px solid black'}}>Jezdec</th>
                                          <th style={{padding: '8px', border: '2px solid black'}}>Kůň</th>
                                          <th className="no-print" style={{padding: '8px', border: '2px solid black'}}>Poznámka</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {riders.map((r, i) => (
                                          <tr key={i} style={{borderBottom: '1px solid #ccc'}}>
                                            <td style={{padding: '8px', border: '2px solid black'}}><strong>{r.draw_order || ''}</strong></td>
                                            <td style={{padding: '8px', border: '2px solid black', fontSize: '1.2rem'}}><strong>{r.start_number}</strong></td>
                                            <td style={{padding: '8px', border: '2px solid black'}}>{r.rider_name}</td>
                                            <td style={{padding: '8px', border: '2px solid black'}}>{r.horse_name}</td>
                                            <td className="no-print" style={{padding: '8px', border: '2px solid black'}}>
                                              <input 
                                                type="text" 
                                                defaultValue={r.payment_note || ''} 
                                                onBlur={(e) => updatePaymentNote(r.id, e.target.value, r.rider_name)} 
                                                placeholder="poznámka"
                                                style={{padding: '5px', width: '100px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '4px'}}
                                              />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={{...styles.adminSection, border: printMode ? 'none' : '1px solid #ddd'}}>
                          <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                            <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Oficiální Scoresheety</button>
                          </div>
                          {renderPrintableScoresheets(adminSelectedEvent)}
                        </div>
                      </>
                    )}

                    {adminTab === 'cashier' && (
                      <div className="no-print" style={styles.adminSection}>
                        <h2 style={{color: '#8e24aa', marginTop: 0, borderBottom: '2px solid #8e24aa', paddingBottom: '10px'}}>💰 Pokladna a Prezence</h2>
                        <p style={{color: '#666'}}>Zde vidíte přehled všech jezdců a jejich plateb.</p>
                        
                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse'}}>
                            <thead>
                              <tr style={{background: '#f3e5f5', textAlign: 'left'}}>
                                <th style={{padding: '10px', borderBottom: '2px solid #ce93d8'}}>Jezdec (St. č.)</th>
                                <th style={{padding: '10px', borderBottom: '2px solid #ce93d8'}}>Disciplíny</th>
                                <th style={{padding: '10px', borderBottom: '2px solid #ce93d8'}}>Celkem k platbě</th>
                                <th style={{padding: '10px', borderBottom: '2px solid #ce93d8', textAlign: 'center'}}>Stav platby</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const evRegs = allRegistrations.filter(r => r.event_id === adminSelectedEvent);
                                const grouped = evRegs.reduce((acc, curr) => {
                                   if (!acc[curr.rider_name]) acc[curr.rider_name] = [];
                                   acc[curr.rider_name].push(curr);
                                   return acc;
                                }, {});

                                return Object.keys(grouped).sort().map(riderName => {
                                   const regs = grouped[riderName];
                                   const startNumbers = [...new Set(regs.map(r => r.start_number))].join(', ');
                                   const totalSum = regs.reduce((sum, r) => sum + r.price, 0);
                                   const allPaid = regs.every(r => r.is_paid);
                                   
                                   return (
                                     <tr key={riderName} style={{borderBottom: '1px solid #eee', background: allPaid ? '#e8f5e9' : 'transparent'}}>
                                       <td style={{padding: '10px'}}>
                                          <strong style={{fontSize: '1.1rem'}}>{riderName}</strong><br/>
                                          <span style={{color: '#888', fontSize: '0.8rem'}}>St. č.: {startNumbers}</span><br/>
                                          <button onClick={() => handleDeleteWholeRider(riderName, adminSelectedEvent)} style={{background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.8rem', padding: '5px 0', marginTop: '5px'}}>🗑️ Smazat jezdce</button>
                                       </td>
                                       <td style={{padding: '10px'}}>
                                          <ul style={{margin: 0, paddingLeft: '15px', fontSize: '0.85rem'}}>
                                            {regs.map(r => (
                                              <li key={r.id} style={{marginBottom: '5px'}}>
                                                {r.discipline} - {r.price} Kč
                                                <button onClick={() => handleDeleteSingleDiscipline(r.id, r.rider_name, r.discipline)} style={{marginLeft: '10px', fontSize: '0.7rem', padding: '2px 5px', cursor: 'pointer', background: '#ffebee', color: '#d32f2f', border: '1px solid #ffcdd2', borderRadius: '3px'}}>
                                                  ❌
                                                </button>
                                              </li>
                                            ))}
                                          </ul>
                                       </td>
                                       <td style={{padding: '10px', fontWeight: 'bold', fontSize: '1.1rem'}}>{totalSum} Kč</td>
                                       <td style={{padding: '10px', textAlign: 'center'}}>
                                          {allPaid ? (
                                            <span style={{color: '#2e7d32', fontWeight: 'bold', fontSize: '1.2rem'}}>✅ VYŘÍZENO</span>
                                          ) : (
                                            <button onClick={() => handlePayAll(riderName, adminSelectedEvent)} style={{background: '#4caf50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'}}>
                                              ZAPLATIT VŠE
                                            </button>
                                          )}
                                       </td>
                                     </tr>
                                   )
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {adminTab === 'vet' && (
                      <div className={printMode === 'vet' ? 'print-area' : 'no-print'} style={styles.adminSection}>
                        <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                          <h2 style={{color: '#00897b', margin: 0}}>🐴 Veterinární přejímka</h2>
                          <button onClick={() => handlePrint('vet')} style={{...styles.btnOutline, border: '2px solid #00897b', color: '#00897b', marginTop: 0}}>🖨️ Vytisknout pro Veterinu</button>
                        </div>
                        {renderVeterinaryList(adminSelectedEvent)}
                      </div>
                    )}

                  </div>
                )}

                {effectiveRole === 'superadmin' && !adminSelectedEvent && (
                  <div className="no-print" style={{...styles.adminSection, border: '2px solid #000', background: '#e0e0e0', marginTop: '20px'}}>
                    <h4 style={{margin: '0 0 10px 0'}}>Logy systému</h4>
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

            {effectiveRole === 'judge' && (
              <div className={printMode ? 'print-area' : ''}>
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{margin: 0, color: '#0277bd'}}>Rozhodčí panel</h3>
                  <input 
                    type="text" 
                    placeholder="Jméno skutečného rozhodčího" 
                    value={actualJudgeName} 
                    onChange={(e) => setActualJudgeName(e.target.value)} 
                    style={{...styles.input, width: '250px', margin: 0, border: '2px solid #0277bd'}}
                    title="Toto jméno se bude propisovat na archy pro tisk."
                  />
                </div>
                
                <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                  {!evaluatingParticipant && (
                    <div>
                      <label style={styles.label}>Vyberte uzamčený závod k hodnocení:</label>
                      <select style={styles.input} value={judgeEvent} onChange={e => { setJudgeEvent(e.target.value); handleJudgeDisciplineChange(e.target.value, ''); }}>
                        <option value="">-- Zvolte závod --</option>
                        {events.filter(ev => ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>

                      {judgeEvent && (
                        <div>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap'}}>
                            <div style={{flex: 1, minWidth: '200px'}}>
                              <label style={styles.label}>Vyberte disciplínu (Zrcadlí se Spíkrovi):</label>
                              <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                                <option value="">-- Zvolte disciplínu --</option>
                                {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            
                            {judgeDiscipline && (
                              <div style={{flex: 2, background: '#e3f2fd', padding: '10px', borderRadius: '6px', border: '1px solid #0277bd'}}>
                                <label style={{...styles.label, marginTop: 0}}>Názvy manévrů (oddělte čárkou, max 20):</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                  <input 
                                    type="text" 
                                    placeholder="např: Kruh P, Kruh L, Spin, Couvání" 
                                    value={maneuversInputString} 
                                    onChange={e => setManeuversInputString(e.target.value)} 
                                    style={{...styles.input, margin: 0}}
                                  />
                                  <button onClick={applyManeuversFromString} style={{...styles.btnSave, background: '#0277bd'}}>Nastavit manévry</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {evaluatingParticipant && (() => {
                    const isShowmanship = evaluatingParticipant.discipline.toLowerCase().includes('showmanship') || 
                                          evaluatingParticipant.discipline.toLowerCase().includes('horsemanship') || 
                                          evaluatingParticipant.discipline.toLowerCase().includes('equitation');
                    let activeCount = 0;
                    for(let i=0; i<20; i++){
                       if(maneuverNames[i] && maneuverNames[i].trim() !== '') activeCount = i + 1;
                    }
                    if(activeCount < 10) activeCount = 10;

                    const cols = Array.from({length: activeCount}, (_, i) => i);

                    return (
                      <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px'}}>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                          <h2 style={{margin: 0}}>{evaluatingParticipant.discipline}</h2>
                          <h2 style={{margin: 0, color: '#d32f2f'}}>St. č.: {evaluatingParticipant.start_number}</h2>
                        </div>
                        <p style={{fontSize: '1.2rem', margin: 0}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>
                        
                        <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                          <button onClick={() => setShowJudgeHints(!showJudgeHints)} style={{...styles.btnOutline, width: 'auto', margin: 0}}>
                            {showJudgeHints ? 'Skrýt nápovědu' : 'ℹ️ Zobrazit nápovědu k disciplíně'}
                          </button>
                        </div>

                        {showJudgeHints && (
                          <div className="no-print" style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #90caf9'}}>
                            <h4 style={{marginTop: 0, color: '#1565c0'}}>Tahák (Pravidla)</h4>
                            <ul style={{paddingLeft: '20px', fontSize: '0.9rem', color: '#333', margin: 0}}>
                              {getRulesForDiscipline(evaluatingParticipant.discipline).map((rule, idx) => (
                                <li key={idx} style={{marginBottom: '8px'}}>{rule}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry (Název a Skóre)</h4>
                            {cols.map((index) => (
                              <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', gap: '10px'}}>
                                <input 
                                  type="text" 
                                  placeholder={`Manévr ${index + 1}`} 
                                  value={maneuverNames[index]} 
                                  onChange={(e) => handleManeuverNameChange(index, e.target.value)} 
                                  style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}} 
                                />
                                <select value={maneuverScores[index]} onChange={(e) => handleManeuverChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '120px', fontWeight: 'bold'}}>
                                  {isShowmanship ? (
                                    <>
                                      <option value={3}>+3 (Exc)</option>
                                      <option value={2.5}>+2.5</option>
                                      <option value={2}>+2 (V.G.)</option>
                                      <option value={1.5}>+1.5</option>
                                      <option value={1}>+1 (Good)</option>
                                      <option value={0.5}>+0.5</option>
                                      <option value={0}>0 (Avg)</option>
                                      <option value={-0.5}>-0.5</option>
                                      <option value={-1}>-1 (Poor)</option>
                                      <option value={-1.5}>-1.5</option>
                                      <option value={-2}>-2 (V.P.)</option>
                                      <option value={-2.5}>-2.5</option>
                                      <option value={-3}>-3 (E.P.)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value={1.5}>+1.5 (Exc)</option>
                                      <option value={1}>+1.0 (V.G.)</option>
                                      <option value={0.5}>+0.5 (Good)</option>
                                      <option value={0}>0 (Avg)</option>
                                      <option value={-0.5}>-0.5 (Poor)</option>
                                      <option value={-1}>-1.0 (V.P.)</option>
                                      <option value={-1.5}>-1.5 (E.P.)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestné body)</h4>
                            {cols.map((index) => (
                              <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', height: '33px'}}>
                                <strong>U manévru {index + 1}</strong>
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="0.5" 
                                  value={penaltyScores[index]} 
                                  onChange={(e) => handlePenaltyChange(index, e.target.value)} 
                                  style={{padding: '5px', width: '60px', borderRadius: '4px', border: '1px solid #d32f2f', textAlign: 'center', color: '#d32f2f', fontWeight: 'bold'}}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{padding: '15px', background: isDq ? '#ffcdd2' : '#e8f5e9', borderRadius: '8px', textAlign: 'right', border: `2px solid ${isDq ? 'red' : '#388e3c'}`, marginTop: '10px'}}>
                          <span style={{fontSize: '1.2rem', color: '#000'}}>Základ: 70 | </span>
                          <strong style={{fontSize: '1.5rem', color: isDq ? 'red' : '#000'}}>CELKOVÉ SKÓRE: {isDq ? 'DQ' : calculateTotalScore()}</strong>
                        </div>

                        <button 
                          onClick={() => setIsDq(!isDq)} 
                          style={{
                            background: isDq ? 'darkred' : 'red', 
                            color: 'white', 
                            padding: '15px', 
                            width: '100%', 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          {isDq ? 'ZRUŠIT DISKVALIFIKACI' : '🚨 DISKVALIFIKACE (DQ)'}
                        </button>

                        <div style={{display: 'flex', gap: '10px'}}>
                          <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Uložit hodnocení vč. Podpisu</button>
                          <button onClick={() => setEvaluatingParticipant(null)} style={{...styles.btnOutline, flex: 1, marginTop: 0}}>Zrušit a zpět na listinu</button>
                        </div>
                      </div>
                    )
                  })()}

                  {judgeEvent && judgeDiscipline && !evaluatingParticipant && (
                    <div style={{marginTop: '20px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Startovní pořadí: {judgeDiscipline}</h4>
                        <button onClick={() => announceDisciplineEnd(judgeDiscipline)} style={{...styles.btnOutline, marginTop: 0, padding: '5px 10px'}}>📣 Oznámit konec disciplíny navenek</button>
                      </div>
                      <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#e1f5fe', textAlign: 'left'}}>
                            <th style={{padding: '10px'}}>Draw</th>
                            <th style={{padding: '10px'}}>Záda</th>
                            <th style={{padding: '10px'}}>Jezdec</th>
                            <th style={{padding: '10px'}}>Kůň</th>
                            <th style={{padding: '10px', textAlign: 'center'}}>Stav</th>
                          </tr>
                        </thead>
                        <tbody>
                          {judgeStartList.length > 0 ? judgeStartList.map(r => {
                            const isScored = scoresheets.some(s => s.participant_id === r.id);
                            const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                            const displayScore = scoreObj?.score_data?.is_dq ? 'DQ' : scoreObj?.total_score;
                            
                            return (
                              <tr key={r.id} style={{borderBottom: '1px solid #eee', background: evaluatingParticipant?.id === r.id ? '#fff9c4' : (isScored ? '#f1f8e9' : 'transparent')}}>
                                <td style={{padding: '10px', fontWeight: 'bold', color: '#0277bd', fontSize: '1.1rem'}}>
                                  <input type="number" defaultValue={r.draw_order || ''} onBlur={e => updateParticipantDraw(r.id, e.target.value)} style={{ width: '50px', padding: '5px', fontWeight: 'bold', border: '1px solid #ccc', borderRadius: '4px' }} />
                                </td>
                                <td style={{padding: '10px', fontWeight: 'bold'}}>{r.start_number}</td>
                                <td style={{padding: '10px'}}>{r.rider_name}</td>
                                <td style={{padding: '10px'}}>{r.horse_name}</td>
                                <td style={{padding: '10px', textAlign: 'center'}}>
                                  {isScored ? (
                                    <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '5px 10px', border: '1px solid #388e3c', color: '#388e3c'}}>Opravit ({displayScore})</button>
                                  ) : (
                                    <button onClick={() => openScoresheet(r)} style={{...styles.btnSave, background: '#0277bd'}}>Hodnotit</button>
                                  )}
                                </td>
                              </tr>
                            );
                          }) : (
                            <tr><td colSpan="5" style={{padding: '15px', textAlign: 'center'}}>Žádní přihlášení jezdci.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className={printMode === 'scoresheets' ? 'print-area' : 'no-print'} style={{...styles.adminSection, marginTop: '30px', border: printMode ? 'none' : '1px solid #ddd'}}>
                    <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                      <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Oficiální Scoresheety</button>
                    </div>
                    {renderPrintableScoresheets(judgeEvent)}
                  </div>
                )}
              </div>
            )}

            {effectiveRole === 'speaker' && (
              <div className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#5d4037'}}>Pohled Hlasatele</h3>
                  
                  {speakerEventId && (
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button 
                        onClick={() => setShowSpeakerResults(false)} 
                        style={{...styles.btnSave, background: !showSpeakerResults ? '#0288d1' : '#e0e0e0', color: !showSpeakerResults ? '#fff' : '#333'}}
                      >
                        📡 Živá Startka
                      </button>
                      <button 
                        onClick={() => setShowSpeakerResults(true)} 
                        style={{...styles.btnSave, background: showSpeakerResults ? '#e65100' : '#e0e0e0', color: showSpeakerResults ? '#fff' : '#333'}}
                      >
                        🏆 Výsledky k vyhlášení
                      </button>
                    </div>
                  )}
                </div>

                {speakerEventId ? (
                  <div>
                    {!showSpeakerResults ? (
                      <div>
                        {/* ŽIVÁ STARTKA */}
                        <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px'}}>
                          <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán závodů:</strong>
                          <span style={{fontSize: '1.2rem', whiteSpace: 'pre-wrap'}}>{lockedEvent?.schedule || 'Plán nebyl zadán'}</span>
                        </div>

                        {!speakerLiveDiscipline ? (
                          <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '2px dashed #ccc'}}>
                            <h2>Čeká se na rozhodčího...</h2>
                            <p>Zde se automaticky zobrazí listina, jakmile rozhodčí vybere disciplínu.</p>
                          </div>
                        ) : (
                          <div style={{marginTop: '30px'}}>
                            <div style={{borderBottom: '3px solid #5d4037', paddingBottom: '15px'}}>
                              <h2 style={{fontSize: '2rem', margin: 0, color: '#5d4037'}}>ŽIVĚ ARÉNA: {speakerLiveDiscipline}</h2>
                              <p style={{margin: '5px 0 0 0', color: '#666'}}>Zrcadlí se to, co právě vidí a hodnotí rozhodčí.</p>
                            </div>

                            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                              <thead>
                                <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                                  <th style={{padding: '15px'}}>Draw</th>
                                  <th style={{padding: '15px'}}>Číslo</th>
                                  <th style={{padding: '15px'}}>Jezdec</th>
                                  <th style={{padding: '15px'}}>Kůň</th>
                                  <th style={{padding: '15px', textAlign: 'center'}}>Stav</th>
                                </tr>
                              </thead>
                              <tbody>
                                {speakerLiveList.length > 0 ? speakerLiveList.map(r => {
                                  const isScored = scoresheets.some(s => s.participant_id === r.id);
                                  return (
                                    <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.5rem', background: isScored ? '#f1f8e9' : '#fff'}}>
                                      <td style={{padding: '15px', fontWeight: 'bold', color: '#5d4037'}}>{r.draw_order || '-'}</td>
                                      <td style={{padding: '15px', fontWeight: '900', fontSize: '1.8rem'}}>{r.start_number}</td>
                                      <td style={{padding: '15px'}}>{r.rider_name}</td>
                                      <td style={{padding: '15px'}}><strong>{r.horse_name}</strong></td>
                                      <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                        {isScored ? '✅ V CÍLI' : 'ČEKÁ'}
                                      </td>
                                    </tr>
                                  );
                                }) : (
                                  <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center', fontSize: '1.2rem'}}>Žádní přihlášení jezdci.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* VÝSLEDKY K VYHLÁŠENÍ (ZMRAZENO) */}
                        <div style={{background: '#fff3e0', padding: '20px', borderRadius: '8px', border: '2px solid #e65100', marginBottom: '20px'}}>
                          <h2 style={{color: '#e65100', margin: '0 0 15px 0'}}>Vyberte disciplínu k vyhlášení</h2>
                          <p style={{margin: '0 0 10px 0'}}>Tato tabulka je nezávislá na rozhodčím. Můžete v klidu vyhlašovat.</p>
                          <select 
                            value={speakerResultDiscipline} 
                            onChange={e => setSpeakerResultDiscipline(e.target.value)} 
                            style={{...styles.input, border: '2px solid #e65100', fontSize: '1.2rem', padding: '15px'}}
                          >
                            <option value="">-- Zvolte disciplínu --</option>
                            {allSpeakerDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>

                        {speakerResultDiscipline && (
                          <div style={{marginTop: '20px'}}>
                            <h2 style={{fontSize: '2rem', margin: '0 0 20px 0', color: '#5d4037', borderBottom: '3px solid #5d4037', paddingBottom: '10px'}}>KONEČNÉ VÝSLEDKY: {speakerResultDiscipline}</h2>
                            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                              <thead>
                                <tr style={{background: '#fff3e0', textAlign: 'left', fontSize: '1.2rem'}}>
                                  <th style={{padding: '15px'}}>Pořadí</th>
                                  <th style={{padding: '15px'}}>St. č.</th>
                                  <th style={{padding: '15px'}}>Jezdec</th>
                                  <th style={{padding: '15px'}}>Kůň</th>
                                  <th style={{padding: '15px', textAlign: 'right'}}>Skóre</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                   const scoredRiders = speakerResultList
                                     .map(r => {
                                       const sObj = scoresheets.find(s => s.participant_id === r.id);
                                       const sc = sObj?.score_data?.is_dq ? 'DQ' : (sObj ? Number(sObj.total_score) : -999);
                                       return { ...r, totalScore: sc };
                                     })
                                     .filter(r => r.totalScore !== -999)
                                     .sort((a, b) => {
                                       if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
                                       if (a.draw_order !== null) return -1;
                                       if (b.draw_order !== null) return 1;

                                       if (a.totalScore === 'DQ') return 1;
                                       if (b.totalScore === 'DQ') return -1;
                                       return b.totalScore - a.totalScore;
                                     });
                                     
                                   if (scoredRiders.length === 0) return <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center'}}>Zatím nejsou k dispozici žádné výsledky.</td></tr>;

                                   return scoredRiders.map((r, index) => {
                                      let medal = '';
                                      if(r.totalScore === 'DQ') medal = '❌';
                                      else if(index === 0) medal = '🥇';
                                      else if(index === 1) medal = '🥈';
                                      else if(index === 2) medal = '🥉';
                                      
                                      const scoreText = r.totalScore === 'DQ' ? 'DQ' : `${r.totalScore} b.`;
                                      return (
                                        <tr key={r.id} style={{borderBottom: '2px solid #eee', fontSize: '1.5rem', background: '#fff'}}>
                                          <td style={{padding: '15px', fontWeight: 'bold'}}>{medal} {index + 1}. {r.draw_order ? <span style={{fontSize:'1rem', color:'#e65100'}}>(Draw {r.draw_order})</span> : ''}</td>
                                          <td style={{padding: '15px', fontWeight: '900', color: '#5d4037'}}>{r.start_number}</td>
                                          <td style={{padding: '15px'}}>{r.rider_name}</td>
                                          <td style={{padding: '15px'}}>{r.horse_name}</td>
                                          <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: r.totalScore === 'DQ' ? 'red' : '#2e7d32'}}>{scoreText}</td>
                                        </tr>
                                      )
                                   });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>Aktuálně neprobíhá žádný uzamčený závod.</p>
                )}
              </div>
            )}

            {effectiveRole === 'player' && (
              <div className="no-print">
                
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Závody a Přihlášky</button>
                  <button onClick={() => setPlayerTab('profile')} style={playerTab === 'profile' ? styles.activeTab : styles.tab}>👤 Profil a Koně</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Komunikační Kanál</button>
                </div>

                {playerTab === 'profile' && (
                  <div style={{maxWidth: '600px', margin: '0 auto'}}>
                    <div style={{...styles.adminSection, background: '#fff'}}>
                      <h3 style={{marginTop: 0}}>👤 Můj Profil</h3>
                      {editMode ? (
                        <form onSubmit={updateProfile}>
                          <input style={styles.inputSmall} placeholder="Jméno a příjmení" value={profile?.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} required/>
                          <input style={styles.inputSmall} type="email" placeholder="Email" value={profile?.email || user?.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} required/>
                          <input style={styles.inputSmall} placeholder="Telefon" value={profile?.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} required/>
                          <input style={styles.inputSmall} placeholder="Číslo hospodářství" value={profile?.stable || ''} onChange={e => setProfile({...profile, stable: e.target.value})} required/>
                          <input style={styles.inputSmall} placeholder="Obec" value={profile?.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} required/>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                            <label style={{fontSize: '0.9rem', fontWeight: 'bold'}}>Datum narození:</label>
                            <input style={{...styles.inputSmall, width: 'auto'}} type="date" value={profile?.birth_date || ''} onChange={e => setProfile({...profile, birth_date: e.target.value})} required/>
                          </div>
                          <button type="submit" style={{...styles.btnSave, marginTop: '15px'}}>Uložit profil</button>
                          <button type="button" onClick={() => setEditMode(false)} style={{...styles.btnSave, background: '#ccc', color: '#333', marginLeft: '5px', marginTop: '15px'}}>Zrušit</button>
                        </form>
                      ) : (
                        <div>
                          <p><strong>{profile?.full_name || 'Nevyplněné jméno'}</strong></p>
                          <p>E-mail: {profile?.email || user?.email}</p>
                          <p>Telefon: {profile?.phone || 'Nevyplněno'}</p>
                          <p>Hospodářství: {profile?.stable || 'Nevyplněno'}</p>
                          <p>Obec: {profile?.city || 'Nevyplněno'}</p>
                          <p>Datum narození: {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('cs-CZ') : 'Nevyplněno'}</p>
                          {( !profile?.full_name || !profile?.phone || !profile?.stable || !profile?.city || !profile?.birth_date ) && (
                            <p style={{color: '#e57373', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Profil není kompletní.</p>
                          )}
                          <button onClick={() => setEditMode(true)} style={styles.btnOutline}>Upravit údaje</button>
                          <button onClick={handleSignOut} style={styles.btnSignOut}>Odhlásit se</button>
                        </div>
                      )}
                    </div>
                    
                    <div style={{...styles.adminSection, background: '#fff', marginTop: '20px'}}>
                      <h3 style={{ marginTop: 0 }}>🐎 Moji koně</h3>
                      {myHorses.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#888' }}>Zatím žádní koně v historii.</p> : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          {myHorses.map(h => (
                            <li key={h.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
                              {editingHorseId === h.id ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '5px', background: '#f5f5f5', padding: '10px', borderRadius: '6px'}}>
                                  <input type="text" value={editHorseName} onChange={e => setEditHorseName(e.target.value)} style={styles.inputSmall} placeholder="Jméno" />
                                  <div style={{display: 'flex', gap: '10px'}}>
                                    <input type="number" value={editHorseYear} onChange={e => setEditHorseYear(e.target.value)} style={styles.inputSmall} placeholder="Rok (např. 2018)" />
                                    <input type="text" value={editHorseIdNum} onChange={e => setEditHorseIdNum(e.target.value)} style={styles.inputSmall} placeholder="ID koně" />
                                  </div>
                                  <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                                    <button onClick={() => saveEditedHorse(h.id)} style={{...styles.btnSave, padding: '5px 10px'}}>Uložit</button>
                                    <button onClick={() => setEditingHorseId(null)} style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <div>
                                    <strong>{h.name}</strong> <br/>
                                    <small style={{color: '#888'}}>(Rok: {h.birth_year || 'Neznámý'} | ID: {h.horse_id_number || 'Neznámé'})</small>
                                  </div>
                                  <div>
                                    <button onClick={() => startEditingHorse(h)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px'}}>✏️ Upravit</button>
                                    <button onClick={() => handleDeleteHorse(h.id, h.name)} style={{background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer'}}>🗑️ Smazat</button>
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {playerTab === 'telegram' && (
                  <div style={{background: '#e3f2fd', padding: '30px 20px', borderRadius: '8px', border: '1px solid #0288d1', textAlign: 'center', margin: '20px 0'}}>
                    <h2 style={{color: '#0288d1', marginTop: 0}}>📱 Sledujte hlášení a výsledky!</h2>
                    <p style={{fontSize: '1.1rem', color: '#333', marginBottom: '20px'}}>Připojte se k aplikaci Telegram a nic vám neuteče.</p>
                    <a href="https://t.me/+xZ7MOtlAaX05YzA0" target="_blank" rel="noopener noreferrer" style={{...styles.btnSave, background: '#0288d1', textDecoration: 'none', display: 'inline-block', fontSize: '1.2rem', padding: '15px 30px'}}>Přidat se</a>
                  </div>
                )}

                {playerTab === 'main' && (
                  <div>
                    <h3 style={{marginTop: 0}}>Nová přihláška k závodu</h3>
                    
                    <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', border: '1px solid #0288d1', marginBottom: '15px'}}>
                      <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Jméno a příjmení jezdce:</label>
                      <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: '5px 0 15px 0'}} placeholder="Zadejte jméno jezdce" />
                      
                      <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Věková kategorie jezdce:</label>
                      <select value={riderAgeCategory} onChange={e => setRiderAgeCategory(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: '5px 0 0 0'}}>
                        <option value="18+">18 a více let (Dospělý)</option>
                        <option value="<18">Méně než 18 let (Dítě / Mládež)</option>
                      </select>
                    </div>

                    <label style={styles.label}>Vyberte závod:</label>
                    <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                      <option value="">-- Který závod pojedete? --</option>
                      {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString('cs-CZ')})</option>)}
                    </select>

                    <label style={styles.label}>Vyberte koně:</label>
                    <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                      <option value="">-- Vyberte koně z historie --</option>
                      {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="new">+ Přidat nového koně</option>
                    </select>
                    {selectedHorse === 'new' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
                        <input type="text" placeholder="Napište jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, margin: 0, border: '2px solid #8d6e63', gridColumn: 'span 2'}} />
                        <input type="number" placeholder="Rok narození (např. 2018)" value={horseBirthYear} onChange={e => setHorseBirthYear(e.target.value)} style={{...styles.input, margin: 0, border: '2px solid #8d6e63'}} />
                        <input type="text" placeholder="ID koně (číslo průkazu)" value={horseIdNumber} onChange={e => setHorseIdNumber(e.target.value)} style={{...styles.input, margin: 0, border: '2px solid #8d6e63'}} />
                      </div>
                    )}

                    <label style={styles.label}>Disciplíny:</label>
                    {filteredPricing.length === 0 ? <p style={{color: 'red'}}>Pro tuto věkovou kategorii nejsou aktuálně žádné disciplíny.</p> : (
                      <div style={styles.disciplineList}>
                        {filteredPricing.map(d => (
                          <div key={d.id} style={{display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eee', background: selectedDisciplines.find(x => x.id === d.id) ? '#d7ccc8' : '#fff'}}>
                            <div onClick={() => {
                              const exists = selectedDisciplines.find(x => x.id === d.id);
                              setSelectedDisciplines(exists ? selectedDisciplines.filter(x => x.id !== d.id) : [...selectedDisciplines, d]);
                            }} style={{...styles.disciplineItem, borderBottom: 'none'}}>
                              <span>{d.discipline_name}</span>
                              <strong>{d.price} Kč</strong>
                            </div>
                            {d.pattern_url && (
                              <div style={{padding: '0 12px 12px 12px'}}>
                                <a href={d.pattern_url} target="_blank" rel="noopener noreferrer" style={{color: '#0288d1', fontSize: '0.85rem'}}>📄 Zobrazit úlohu k této disciplíně</a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={styles.priceTag}>
                      Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč
                    </div>

                    <button 
                     onClick={handleRaceRegistration} 
                     disabled={loading} 
                     style={{ ...styles.btnSecondary, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                     >
                    {loading ? 'ODESÍLÁM PŘIHLÁŠKU (ČEKEJTE)...' : 'ODESLAT PŘIHLÁŠKU'}
                    </button>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Moje přihlášky</h3>
                        
                        {events.filter(e => allRegistrations.filter(r => r.user_id === user?.id).some(r => r.event_id === e.id) && e.schedule).map(ev => (
                          <div key={ev.id} style={{background: '#f5f5f5', padding: '10px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #8d6e63'}}>
                            <strong style={{color: '#5d4037'}}>Plán pro závod {ev.name}:</strong><br/>
                            <span style={{whiteSpace: 'pre-wrap'}}>{ev.schedule}</span>
                          </div>
                        ))}

                        <div style={{overflowX: 'auto'}}>
                          <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginTop: '10px'}}>
                            <thead>
                              <tr style={{background: '#eee', textAlign: 'left'}}>
                                <th style={{padding: '8px'}}>Závod</th>
                                <th style={{padding: '8px'}}>Jezdec</th>
                                <th style={{padding: '8px'}}>Kůň</th>
                                <th style={{padding: '8px'}}>Disciplína</th>
                                <th style={{padding: '8px'}}>Záda</th>
                                <th style={{padding: '8px'}}>Skóre</th>
                                <th style={{padding: '8px', textAlign: 'center'}}>Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRegistrations.filter(r => r.user_id === user?.id).map(r => {
                                const eventObj = events.find(e => e.id === r.event_id);
                                const eventName = eventObj?.name || 'Neznámý závod';
                                const isEventLocked = eventObj?.is_locked || false;
                                const scoreObj = scoresheets.find(s => s.participant_id === r.id);
                                const isDqResult = scoreObj?.score_data?.is_dq;
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px'}}>{eventName}</td>
                                    <td style={{padding: '8px', fontWeight: 'bold'}}>{r.rider_name}</td>
                                    <td style={{padding: '8px'}}>{r.horse_name}</td>
                                    <td style={{padding: '8px'}}>{r.discipline}</td>
                                    <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                    <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? (isDqResult ? 'red' : '#2e7d32') : '#888'}}>
                                      {scoreObj ? (isDqResult ? 'DQ' : scoreObj.total_score) : 'Čeká se'}
                                    </td>
                                    <td style={{padding: '8px', textAlign: 'center'}}>
                                      {!isEventLocked ? (
                                        <button onClick={() => handleCancelRegistration(r.id)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Zrušit</button>
                                      ) : (
                                        <span style={{color: '#888', fontSize: '0.8rem'}}>Uzamčeno</span>
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
  disciplineList: { maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px' },
  disciplineItem: { display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.95rem' },
  priceTag: { marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'right', color: '#5d4037' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4ece4' }
};
