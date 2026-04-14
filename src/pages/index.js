// ==========================================
// ============ ZAČÁTEK ČÁSTI 1 ============
// ==========================================
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
  const [speakerLiveSelectedDiscipline, setSpeakerLiveSelectedDiscipline] = useState(''); // PŘIDÁNO

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
// ==========================================
// ============= KONEC ČÁSTI 1 ==============
// ==========================================
// ==========================================
// ============ ZAČÁTEK ČÁSTI 2 ============
// ==========================================
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
// ==========================================
// ============= KONEC ČÁSTI 2 ==============
// ==========================================
// ==========================================
// ============ ZAČÁTEK ČÁSTI 3 ============
// ==========================================
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('events').insert([{ 
      name: newEventName, 
      event_date: newEventDate, 
      start_num_from: parseInt(newStartNumFrom),
      start_num_to: parseInt(newStartNumTo),
      propositions: DEFAULT_PROPOSITIONS
    }]);
    
    if (error) {
      alert(error.message);
    } else { 
      await logSystemAction('Vypsán nový závod', { name: newEventName });
      const tgMsg = `🎉 <b>NOVÉ ZÁVODY VYPSÁNY!</b>\n\n🏆 <b>Název:</b> ${newEventName}\n📅 <b>Datum:</b> ${new Date(newEventDate).toLocaleDateString('cs-CZ')}\n\nPřihlášky byly právě otevřeny. Těšíme se na vás pod Humprechtem! 🤠`;
      await sendTelegramMessage(tgMsg);
      try {
        const { data: profs } = await supabase.from('profiles').select('email').not('email', 'is', null);
        if (profs && profs.length > 0) {
          const allEmails = profs.map(p => p.email).filter(e => e.includes('@'));
          if (allEmails.length > 0) {
            await fetch('/api/send-invites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventName: newEventName, eventDate: newEventDate, emails: allEmails })
            });
          }
        }
      } catch (mailErr) {
        console.error('Chyba e-mailu:', mailErr);
      }
      alert('Závod vytvořen a oznámení odesláno!'); 
      window.location.reload(); 
    }
  };

  const handleDeleteEvent = async (id, name) => {
    if (confirm(`Opravdu chcete NENÁVRATNĚ SMAZAT závod "${name}" a všechny jeho přihlášky a výsledky?`)) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) alert(error.message);
      else {
        await logSystemAction('Smazán závod', { eventName: name });
        window.location.reload();
      }
    }
  };

  const toggleEventLock = async (id, currentLocked, eventName) => {
    if (confirm(currentLocked ? 'Opravdu chcete závod znovu otevřít pro přihlášky?' : 'Opravdu chcete uzamknout přihlášky a odeslat startku rozhodčímu a hlasateli?')) {
      const { error } = await supabase.from('events').update({ is_locked: !currentLocked }).eq('id', id);
      if (error) alert(error.message);
      else window.location.reload();
    }
  };

  const startEditingEventProps = (ev) => {
    setEditingEventPropsId(ev.id);
    setEditEventPropsText(ev.propositions || '');
    setEditEventPatternsUrl(ev.patterns_url || '');
  };

  const saveEventProps = async (id) => {
    const { error } = await supabase.from('events').update({ 
       propositions: editEventPropsText,
       patterns_url: editEventPatternsUrl 
    }).eq('id', id);
    
    if (error) {
       if (error.message.includes('patterns_url')) {
          alert('Upozornění: Vaše databáze zatím nepodporuje ukládání odkazu na úlohy (chybí sloupec patterns_url). Ukládám jen propozice.');
          await supabase.from('events').update({ propositions: editEventPropsText }).eq('id', id);
       } else {
          return alert(error.message);
       }
    }
    
    alert('Uloženo!');
    setEditingEventPropsId(null);
    checkUser();
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    let patternUrl = null;
    if (patternFile) {
      const fileExt = patternFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage.from('patterns').upload(fileName, patternFile);
      if (uploadError) return alert('Chyba při nahrávání souboru: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('pricing').insert([{ discipline_name: newDiscName, price: parseInt(newDiscPrice), pattern_url: patternUrl }]);
    if (error) alert(error.message);
    else window.location.reload(); 
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
      if (uploadError) return alert('Chyba nahrávání: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('patterns').getPublicUrl(fileName);
      patternUrl = urlData.publicUrl;
    }

    const updateData = { price: parseInt(editDiscPrice) };
    if (patternUrl) updateData.pattern_url = patternUrl;

    const { error } = await supabase.from('pricing').update(updateData).eq('id', id);
    if (error) alert(error.message);
    else {
      setEditingPricingId(null);
      window.location.reload();
    }
  };

  const handleDeletePricing = async (id, discName) => {
    if (confirm(`Opravdu chcete smazat disciplínu ${discName}?`)) {
      await supabase.from('pricing').delete().eq('id', id);
      window.location.reload();
    }
  };

  const updatePaymentNote = async (id, note, riderName) => {
    await supabase.from('race_participants').update({ payment_note: note }).eq('id', id);
  };

  const togglePaymentStatus = async (id, currentStatus) => {
    await supabase.from('race_participants').update({ is_paid: !currentStatus }).eq('id', id);
    checkUser();
  };

  const handleDeleteSingleDiscipline = async (id, riderName, discipline) => {
    if(confirm(`Opravdu smazat disciplínu "${discipline}" u jezdce ${riderName}?`)) {
      await supabase.from('race_participants').delete().eq('id', id);
      checkUser();
    }
  };

  const handleDeleteWholeRider = async (riderName, eventId) => {
    if(confirm(`NENÁVRATNĚ smazat VŠECHNY přihlášky jezdce ${riderName} z tohoto závodu?`)) {
      await supabase.from('race_participants').delete().eq('rider_name', riderName).eq('event_id', eventId);
      checkUser();
    }
  };

  const handlePayAll = async (riderName, eventId) => {
    await supabase.from('race_participants').update({is_paid: true}).eq('rider_name', riderName).eq('event_id', eventId);
    checkUser();
  };

  const handleUpdateSchedule = async (eventId, currentSchedule) => {
    const msg = prompt("Zadejte textový plán závodů:", currentSchedule || "");
    if (msg !== null) {
      const { error } = await supabase.from('events').update({ schedule: msg }).eq('id', eventId);
      if (!error && msg.trim() !== '') {
        await sendTelegramMessage(`📅 <b>AKTUÁLNÍ PLÁN ZÁVODŮ:</b>\n\n${msg}`);
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

    const disciplines = [...new Set(allRegistrations.filter(r => r.event_id === eventId).map(r => r.discipline))].sort((a, b) => a.localeCompare(b, 'cs'));

    disciplines.forEach(disc => {
      const ridersInDisc = allRegistrations.filter(r => r.event_id === eventId && r.discipline === disc);
      const scoredRiders = ridersInDisc
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

      if(scoredRiders.length > 0) {
        tgMsg += `📍 <b>${disc}</b>\n`;
        scoredRiders.forEach((r, index) => {
          let medal = '🏅';
          if(r.totalScore === 'DQ') medal = '❌';
          else if(index === 0) medal = '🥇';
          else if(index === 1) medal = '🥈';
          else if(index === 2) medal = '🥉';
          
          const scoreText = r.totalScore === 'DQ' ? 'DQ' : `${r.totalScore} b.`;
          tgMsg += `${medal} ${index + 1}. ${r.rider_name} (${r.horse_name}) - <b>${scoreText}</b>\n`;
        });
        tgMsg += `\n`;
      }
    });

    tgMsg += `Děkujeme všem jezdcům a gratulujeme vítězům! 🎉 Originální archy naleznete v naší skupině.`;

    await sendTelegramMessage(tgMsg);
    alert('Závody byly ukončeny a výsledková listina odeslána!');
  };
// ==========================================
// ============= KONEC ČÁSTI 3 ==============
// ==========================================
// ==========================================
// ============ ZAČÁTEK ČÁSTI 4 ============
// ==========================================
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
                
                <table className="wrc-scoresheet" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem', border: '2px solid black' }}>
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
// ==========================================
// ============= KONEC ČÁSTI 4 ==============
// ==========================================
// ==========================================
// ============ ZAČÁTEK ČÁSTI 5 ============
// ==========================================
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
                                       // ABSOLUTNÍ PŘEDNOST: Políčko Draw
                                       if (a.draw_order !== null && b.draw_order !== null) return a.draw_order - b.draw_order;
                                       if (a.draw_order !== null) return -1;
                                       if (b.draw_order !== null) return 1;

                                       // Pokud nemají Draw, rozhoduje skóre
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

            {/* POHLED HRÁČE / JEZDCE */}
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
// ==========================================
// ============= KONEC ČÁSTI 5 ==============
// ==========================================
