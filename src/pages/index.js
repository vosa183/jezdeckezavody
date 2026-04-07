// # Blok 3
  // GLOBÁLNÍ POHLED PRAVIDEL (KDYKOLIV DOSTUPNÝ POUZE PRO PŘIHLÁŠENÉ UŽIVATELE)
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

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px', fontSize: '1.1rem'}}>
            <div>
              <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                <li style={{marginBottom: '10px'}}><strong>Pořadatel:</strong> JK Sobotka – Pavla Koklesová</li>
                <li style={{marginBottom: '10px'}}><strong>Termín konání:</strong> Uveden v názvu závodu</li>
                <li style={{marginBottom: '10px'}}><strong>Rozhodčí:</strong> Pavla Doubravová</li>
                <li style={{marginBottom: '10px'}}><strong>Ředitel akce:</strong> Pavla Koklesová</li>
                <li style={{marginBottom: '10px'}}><strong>Sekretář závodů:</strong> Leona Plocková (plockovaleona@seznam.cz)</li>
              </ul>
            </div>
            <div>
              <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                <li style={{marginBottom: '10px'}}><strong>Místo konání:</strong> Sobotka – kolbiště a jízdárna pod Humprechtem<br/>(Adresa: Pod Humprechtem 507 43)</li>
                <li style={{marginBottom: '10px'}}><strong>Zdravotní služba:</strong> Červený kříž</li>
                <li style={{marginBottom: '10px'}}><strong>Uzávěrka přihlášek:</strong> 36h. před zahajením</li>
                <li style={{marginBottom: '10px'}}><strong>Kontakty:</strong> 721 456 049, 702 165 991</li>
              </ul>
            </div>
          </div>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Informace o akci a Poplatky</h4>
          <p style={{fontSize: '1.1rem'}}>Sledujte naše oficiální informační kanály na internetu a událost Westernové hobby závody pod Humprechtem.</p>
          <ul style={{marginBottom: '20px', fontSize: '1.1rem'}}>
            <li><strong>300 Kč</strong> (kategorie Open, Hříbata)</li>
            <li><strong>250 Kč</strong> (kategorie Mládež, Děti)</li>
          </ul>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Časový plán</h4>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Veterinární přejímka bude probíhat od <strong>8:00 do 9:00</strong>. Předpokládaný čas zahájení akce je cca <strong>9:00</strong>. Čas je pouze orientační a může se změnit.</p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Veterinární podmínky</h4>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Kůň musí být v imunitě proti influenze (chřipce) koní. Kůň starší 12 měsíců musí být laboratorně vyšetřen s negativním výsledkem na infekční anemii, vyšetření nesmí být starší 12 měsíců. Soutěžící jsou povinni řídit se Řádem ochrany koní při veřejném vystoupení a svodu koní.</p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Všeobecné podmínky</h4>
          <p style={{fontSize: '1.1rem'}}>Za bezpečnost nezletilého odpovídá rodič nebo jím pověřená osoba. Pokud jezdec koně dostatečně neovládá, a omezuje či ohrožuje ostatní účastníky, má pořadatel (prostřednictvím ředitele akce nebo pořadatele) právo je vyloučit bez nároku na vrácení startovného.</p>
          <p style={{fontSize: '1.1rem'}}>Pořadatel si vyhrazuje právo neumožnit účast v soutěžním prostoru koním, kteří nejsou ve vhodném zdravotním či výživovém stavu, nebo mají nevhodně padnoucí či poškozenou výstroj, a to v zájmu zajištění welfare zvířat.</p>
          <p style={{fontSize: '1.1rem'}}>V případě, že jezdec/vodič nedokáže dostatečně ovládat koně a tím například omezuje nebo ohrožuje ostatní účastníky – ať už v soutěžním prostoru nebo na opracovišti – má pořadatel (prostřednictvím ředitele závodů, stevarda nebo jiné odpovědné osoby) právo takového účastníka vyloučit bez nároku na vrácení startovného.</p>
          <p style={{fontSize: '1.1rem'}}>Žádáme tímto rodiče, trenéry i jezdce, aby zvážili své schopnosti a připravenost koně i jezdce, a předešli tak situacím, které by mohly ohrozit bezpečný a férový průběh závodů.</p>
          <p style={{marginBottom: '20px', fontSize: '1.1rem'}}>Pořadatel neručí za případné úrazy koní a jezdců, za ztráty předmětů a jejich poškození. <strong>Není potřeba vlastnit licenci nebo být členem asociace.</strong></p>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>DISCIPLÍNY</h4>
          <ul style={{marginBottom: '20px', fontSize: '1.1rem'}}>
            <li>Showmanship at Halter (open, mládež, děti, hříbata)</li>
            <li>Western Horsemanship (open, mládež, děti)</li>
            <li>Ranch Rail Pleasure (open, mládež)</li>
            <li>Ranch Riding (open, mládež)</li>
            <li>Ranch Trail (open, mládež)</li>
            <li>In-Hand Trail (open, mládež, děti, hříbata)</li>
            <li>Trail (open, mládež, děti)</li>
            <li>Kovbojská stezka - může se předvést ze sedla i ze země (děti, mládež, hříbata, open)</li>
          </ul>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Kategorie</h4>
          <ol style={{marginBottom: '20px', fontSize: '1.1rem'}}>
            <li style={{marginBottom: '10px'}}><strong>Open</strong> – otevřená kategorie pro všechny. (Cvalové pasáže jsou umožněny zajet v klusu za snížený počet bodů).</li>
            <li style={{marginBottom: '10px'}}><strong>Mládež</strong> – rozdělena na:
              <ul>
                <li><em>Začátečníci (Rookies):</em> do 14 let včetně (chody krok, klus - možnost individuálního posouzení).</li>
                <li><em>Pokročilí (Advanced):</em> do 18 let včetně. (Cvalové pasáže jsou umožněny zajet v klusu za snížený počet bodů).</li>
              </ul>
            </li>
            <li style={{marginBottom: '10px'}}><strong>Děti</strong> – do 12 let včetně – s vodičem nebo bez vodiče.</li>
            <li style={{marginBottom: '10px'}}><strong>Hříbata</strong> – do 3 let včetně.</li>
          </ol>

          <h4 style={{color: '#5d4037', fontSize: '1.2rem'}}>Výstroj</h4>
          <p style={{fontSize: '1.1rem'}}><strong>Kůň:</strong></p>
          <ul style={{fontSize: '1.1rem'}}>
            <li>Výstroj může být anglická i westernová.</li>
            <li>V rančovních disciplínách je povoleno bezudidlové vedení.</li>
            <li>Je povoleno i obouruční vedení na pákovém udidle.</li>
          </ul>
          <p style={{marginTop: '10px', fontSize: '1.1rem'}}><strong>Jezdec:</strong></p>
          <ul style={{marginBottom: '20px', fontSize: '1.1rem'}}>
            <li>Westernový klobouk či přilba, košile s dlouhým rukávem, dlouhé kalhoty.</li>
            <li><strong>Pro kategorie mládež a děti je bezpečnostní přilba povinná.</strong></li>
          </ul>
        </div>
      </div>
    );
  }

  // ZDE ZAČÍNÁ KLASICKÁ APLIKACE
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

      {/* GLOBÁLNÍ ZÁLOŽKY - VIDITELNÉ JEN PRO PŘIHLÁŠENÉ UŽIVATELE */}
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
                      <button onClick={() => setAdminSelectedEvent('accounts')} style={adminSelectedEvent === 'accounts' ? {...styles.activeTab, background: '#e65100'} : {...styles.tab, background: '#e65100'}}>Vytvořit Účet</button>
                    )}
                    <button onClick={() => setAdminSelectedEvent('telegram')} style={adminSelectedEvent === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Telegram Zprávy</button>
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
                      <h4 style={{margin: '0 0 10px 0'}}>Ceník disciplín</h4>
                      <form onSubmit={handleCreatePricing} style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px'}}>
                        <input type="text" placeholder="Nová disciplína..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{...styles.inputSmall, flex: 1, minWidth: '150px'}} required/>
                        <input type="number" placeholder="Cena" value={newDiscPrice} onChange={e => setNewDiscPrice(e.target.value)} style={{...styles.inputSmall, width: '90px'}} required/>
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
                                  <button onClick={() => handleEditPrice(p.id, p.price, p.discipline_name)} style={{background: 'none', border: 'none', color: '#0277bd', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold'}}>Edit</button>
                                  <button onClick={() => handleDeletePricing(p.id, p.discipline_name)} style={{background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontWeight: 'bold'}}>Smazat</button>
                                </td>
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
                      <p>Zde můžete vytvořit účet pro Hlasatele nebo Rozhodčího. Zadaný e-mail pak využijte v nastavení pro odeslání přístupových údajů.</p>
                      <form onSubmit={handleCreateAccount} style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px'}}>
                        <input type="email" placeholder="E-mailová adresa" value={newAccountEmail} onChange={e => setNewAccountEmail(e.target.value)} style={styles.inputSmall} required/>
                        <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)} style={styles.inputSmall}>
                          <option value="judge">Rozhodčí (Judge)</option>
                          <option value="speaker">Hlasatel (Speaker)</option>
                          <option value="admin">Administrátor</option>
                        </select>
                        <button type="submit" style={{...styles.btnSave, background: '#e65100'}}>Vygenerovat heslo a přístup</button>
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

                {adminSelectedEvent && adminSelectedEvent !== 'telegram' && adminSelectedEvent !== 'accounts' && (
                  <div className={printMode ? 'print-area' : ''}>
                    
                    <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                      <div>
                        <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz pro Spíkra:</strong>
                        <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === adminSelectedEvent)?.speaker_message || 'Žádná zpráva'}</span>
                      </div>
                      <button onClick={() => handleUpdateSpeakerMessage(adminSelectedEvent, events.find(e => e.id === adminSelectedEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                    </div>

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
                        <h2 style={{display: 'none', margin: '0 0 20px 0', textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px'}} className="print-only">Startovní listina: {events.find(e => e.id === adminSelectedEvent)?.name}</h2>
                        <button className="no-print" onClick={() => handlePrint('startlist')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Startku</button>
                      </div>
                      <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse'}}>
                          <thead>
                            <tr style={{background: '#eee', textAlign: 'left'}}>
                              <th style={{padding: '8px', width: '60px'}}>Záda</th>
                              <th style={{padding: '8px', width: '60px'}}>Draw</th>
                              <th style={{padding: '8px'}}>Jezdec</th>
                              <th style={{padding: '8px'}}>Kůň</th>
                              <th style={{padding: '8px'}}>Disciplína</th>
                              <th className="no-print" style={{padding: '8px'}}>Poznámka k platbě</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allRegistrations.filter(r => r.event_id === adminSelectedEvent).map((r, i) => (
                              <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                                <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                <td style={{padding: '8px'}}><strong>{r.draw_order || '-'}</strong></td>
                                <td style={{padding: '8px'}}>{r.rider_name}</td>
                                <td style={{padding: '8px'}}>{r.horse_name}</td>
                                <td style={{padding: '8px'}}>{r.discipline}</td>
                                <td className="no-print" style={{padding: '8px'}}>
                                  <input 
                                    type="text" 
                                    defaultValue={r.payment_note || ''} 
                                    onBlur={(e) => updatePaymentNote(r.id, e.target.value, r.rider_name)} 
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

                    <div className={printMode === 'startlist' ? 'no-print' : 'print-area'} style={{...styles.adminSection, border: printMode ? 'none' : '1px solid #ddd'}}>
                      <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <h4 style={{margin: 0}}>Scoresheety k tisku</h4>
                        <button onClick={() => handlePrint('scoresheets')} style={{...styles.btnOutline, marginTop: 0, border: '2px solid #333', color: '#333'}}>🖨️ Vytisknout Oficiální Scoresheety</button>
                      </div>
                      
                      {renderPrintableScoresheets(adminSelectedEvent)}

                    </div>
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
                <div className="no-print" style={{display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0277bd', paddingBottom: '10px', marginBottom: '20px'}}>
                  <h3 style={{marginTop: 0, color: '#0277bd'}}>Rozhodčí panel</h3>
                </div>

                {judgeEvent && !evaluatingParticipant && (
                  <div className="no-print" style={{marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '2px solid #ffb300', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div>
                      <strong style={{color: '#e65100', display: 'block', marginBottom: '5px'}}>🔇 Interní vzkaz pro Spíkra:</strong>
                      <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>{events.find(e => e.id === judgeEvent)?.speaker_message || 'Žádná zpráva'}</span>
                    </div>
                    <button onClick={() => handleUpdateSpeakerMessage(judgeEvent, events.find(e => e.id === judgeEvent)?.speaker_message)} style={{...styles.btnSave, background: '#ffb300', color: '#000', margin: 0}}>Upravit vzkaz</button>
                  </div>
                )}
                
                <div className={printMode === 'scoresheets' ? 'no-print' : 'print-area'}>
                  {evaluatingParticipant ? (
                    <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #0277bd', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      
                      <div style={{flex: 2, minWidth: '300px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <h2 style={{marginTop: 0}}>{evaluatingParticipant.discipline}</h2>
                          <h2 style={{marginTop: 0}}>Startovní číslo: {evaluatingParticipant.start_number}</h2>
                        </div>
                        <p style={{fontSize: '1.2rem', marginBottom: '30px'}}>Jezdec: <strong>{evaluatingParticipant.rider_name}</strong> | Kůň: <strong>{evaluatingParticipant.horse_name}</strong></p>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Manévry (Skóre)</h4>
                            {maneuverScores.map((score, index) => (
                              <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                <strong>Manévr {index + 1}</strong>
                                <select value={score} onChange={(e) => handleManeuverChange(index, e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}>
                                  <option value="1.5">+1.5 (Excellent)</option>
                                  <option value="1.0">+1.0 (Very Good)</option>
                                  <option value="0.5">+0.5 (Good)</option>
                                  <option value="0">0 (Average)</option>
                                  <option value="-0.5">-0.5 (Poor)</option>
                                  <option value="-1.0">-1.0 (Very Poor)</option>
                                  <option value="-1.5">-1.5 (Extremely Poor)</option>
                                </select>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h4 style={{borderBottom: '1px solid #ccc', paddingBottom: '5px'}}>Penalizace (Trestné body)</h4>
                            {penaltyScores.map((penalty, index) => (
                              <div key={index} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center'}}>
                                <strong>U manévru {index + 1}</strong>
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="0.5" 
                                  value={penalty} 
                                  onChange={(e) => handlePenaltyChange(index, e.target.value)} 
                                  style={{padding: '5px', width: '60px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center'}}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{marginTop: '30px', padding: '15px', background: '#e1f5fe', borderRadius: '8px', textAlign: 'right', border: '2px solid black'}}>
                          <span style={{fontSize: '1.2rem', color: '#000'}}>Základ: 70 | </span>
                          <strong style={{fontSize: '1.5rem', color: '#000'}}>CELKOVÉ SKÓRE: {calculateTotalScore()}</strong>
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                          <button onClick={saveScore} style={{...styles.btnSave, background: '#0277bd', flex: 1, padding: '15px', fontSize: '1.1rem'}}>Uložit hodnocení vč. Podpisu</button>
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
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                            <div style={{flex: 1}}>
                              <label style={styles.label}>Vyberte disciplínu (Zrcadlí se Spíkrovi):</label>
                              <select style={styles.input} value={judgeDiscipline} onChange={e => handleJudgeDisciplineChange(judgeEvent, e.target.value)}>
                                <option value="">-- Zvolte disciplínu --</option>
                                {activeJudgeDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {judgeEvent && judgeDiscipline && (
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
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '10px', fontWeight: 'bold', color: '#0277bd', fontSize: '1.1rem'}}>{r.draw_order}</td>
                                    <td style={{padding: '10px', fontWeight: 'bold'}}>{r.start_number}</td>
                                    <td style={{padding: '10px'}}>{r.rider_name}</td>
                                    <td style={{padding: '10px'}}>{r.horse_name}</td>
                                    <td style={{padding: '10px', textAlign: 'center'}}>
                                      {isScored ? (
                                        <button onClick={() => openScoresheet(r)} style={{...styles.btnOutline, padding: '5px 10px', border: '1px solid #4caf50', color: '#4caf50'}}>Opravit ({scoreObj.total_score})</button>
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
                </div>
                
                {speakerEventId ? (
                  <div>
                    <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px'}}>
                      <strong style={{color: '#333', display: 'block', marginBottom: '5px'}}>📋 Plán závodů:</strong>
                      <span style={{fontSize: '1.2rem'}}>{lockedEvent?.schedule || 'Plán nebyl zadán'}</span>
                    </div>

                    {lockedEvent?.speaker_message && (
                      <div style={{background: '#ffe0b2', border: '4px solid #e65100', padding: '20px', borderRadius: '12px', marginTop: '10px', marginBottom: '30px', textAlign: 'center'}}>
                        <h3 style={{margin: '0 0 10px 0', color: '#e65100', textTransform: 'uppercase', letterSpacing: '2px'}}>🚨 Zpráva od pořadatele:</h3>
                        <p style={{fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#e65100'}}>
                          {lockedEvent?.speaker_message}
                        </p>
                      </div>
                    )}

                    {!speakerDiscipline ? (
                      <div style={{padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '2px dashed #ccc'}}>
                        <h2>Čeká se na rozhodčího...</h2>
                        <p>Zde se automaticky zobrazí listina.</p>
                      </div>
                    ) : (
                      <div style={{marginTop: '30px'}}>
                        <h2 style={{fontSize: '2rem', textAlign: 'center', color: '#5d4037', borderBottom: '3px solid #5d4037', paddingBottom: '15px'}}>ARÉNA: {speakerDiscipline}</h2>
                        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
                          <thead>
                            <tr style={{background: '#d7ccc8', textAlign: 'left', fontSize: '1.2rem'}}>
                              <th style={{padding: '15px'}}>Draw</th>
                              <th style={{padding: '15px'}}>Číslo</th>
                              <th style={{padding: '15px'}}>Jezdec</th>
                              <th style={{padding: '15px'}}>Kůň</th>
                              <th style={{padding: '15px', textAlign: 'right'}}>Skóre</th>
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
                                  <td style={{padding: '15px'}}>{r.rider_name}</td>
                                  <td style={{padding: '15px'}}><strong>{r.horse_name}</strong></td>
                                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: isScored ? '#2e7d32' : '#ccc'}}>
                                    {isScored ? `${scoreObj.total_score} bodů` : 'Na trati'}
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
                  <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>Aktuálně neprobíhá žádný uzamčený závod.</p>
                )}
              </div>
            )}

            {effectiveRole === 'player' && (
              <div className="no-print">
                
                <div style={{display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '2px solid #8d6e63', paddingBottom: '10px', marginBottom: '20px'}}>
                  <button onClick={() => setPlayerTab('main')} style={playerTab === 'main' ? styles.activeTab : styles.tab}>Závody a Přihlášky</button>
                  <button onClick={() => setPlayerTab('telegram')} style={playerTab === 'telegram' ? {...styles.activeTab, background: '#0288d1'} : {...styles.tab, background: '#0288d1'}}>📱 Komunikační Kanál</button>
                </div>

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
                    
                    <label style={styles.label}>Vyberte závod:</label>
                    <select style={styles.input} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                      <option value="">-- Který závod pojedete? --</option>
                      {events.filter(ev => !ev.is_locked).map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({new Date(ev.event_date).toLocaleDateString()})</option>)}
                    </select>

                    <label style={styles.label}>Vyberte koně:</label>
                    <select style={styles.input} value={selectedHorse} onChange={e => setSelectedHorse(e.target.value)}>
                      <option value="">-- Vyberte koně z historie --</option>
                      {myHorses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                      <option value="new">+ Přidat nového koně</option>
                    </select>
                    {selectedHorse === 'new' && (
                      <input type="text" placeholder="Napište jméno koně..." value={newHorseName} onChange={e => setNewHorseName(e.target.value)} style={{...styles.input, border: '2px solid #8d6e63'}} />
                    )}

                    <label style={styles.label}>Disciplíny:</label>
                    {pricing.length === 0 ? <p style={{color: 'red'}}>Ceník prázdný.</p> : (
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

                    {uiHasKidsDisc && (
                      <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '6px', border: '1px solid #0288d1', marginTop: '15px'}}>
                        <label style={{...styles.label, marginTop: 0, color: '#0288d1'}}>Jméno závodícího dítěte / mládežníka:</label>
                        <input type="text" value={customRiderName} onChange={e => setCustomRiderName(e.target.value)} style={{...styles.input, border: '2px solid #0288d1', margin: '5px 0 0 0'}} placeholder="Zadejte jméno dítěte" />
                      </div>
                    )}

                    {mixWarning && (
                      <div style={{background: '#ffebee', padding: '15px', borderRadius: '6px', border: '2px solid #d32f2f', color: '#d32f2f', fontWeight: 'bold', marginTop: '15px'}}>
                        ⚠️ NELZE KOMBINOVAT! Nelze v jedné přihlášce míchat dětské a dospělé (např. Open) disciplíny. Pokud přihlašujete více dětí nebo sebe a dítě, musíte podat přihlášku za každého závodníka samostatně.
                      </div>
                    )}
                    
                    <div style={styles.priceTag}>
                      Celkem k platbě: {selectedDisciplines.reduce((sum, d) => sum + d.price, 0)} Kč
                    </div>

                    <button 
                      onClick={handleRaceRegistration} 
                      style={{...styles.btnSecondary, background: mixWarning ? '#ccc' : '#8d6e63', cursor: mixWarning ? 'not-allowed' : 'pointer'}}
                      disabled={mixWarning}
                    >
                      ODESLAT PŘIHLÁŠKU
                    </button>

                    {allRegistrations.filter(r => r.user_id === user?.id).length > 0 && (
                      <div style={{marginTop: '40px'}}>
                        <h3 style={{borderBottom: '2px solid #8d6e63', paddingBottom: '10px'}}>Moje přihlášky</h3>
                        
                        {events.filter(e => allRegistrations.filter(r => r.user_id === user?.id).some(r => r.event_id === e.id) && e.schedule).map(ev => (
                          <div key={ev.id} style={{background: '#f5f5f5', padding: '10px', borderRadius: '6px', marginBottom: '15px', borderLeft: '4px solid #8d6e63'}}>
                            <strong style={{color: '#5d4037'}}>Plán pro závod {ev.name}:</strong><br/>
                            {ev.schedule}
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
                                
                                return (
                                  <tr key={r.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '8px'}}>{eventName}</td>
                                    <td style={{padding: '8px', fontWeight: 'bold'}}>{r.rider_name}</td>
                                    <td style={{padding: '8px'}}>{r.horse_name}</td>
                                    <td style={{padding: '8px'}}>{r.discipline}</td>
                                    <td style={{padding: '8px'}}><strong>{r.start_number}</strong></td>
                                    <td style={{padding: '8px', fontWeight: 'bold', color: scoreObj ? '#2e7d32' : '#888'}}>
                                      {scoreObj ? scoreObj.total_score : 'Čeká se'}
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
