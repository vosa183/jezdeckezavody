/* eslint-disable */
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Head from 'next/head';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PredplatnePortal() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myClub, setMyClub] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Cenové stavy
  const [globalAnnualPrice, setGlobalAnnualPrice] = useState(1200);
  const [effectivePrices, setEffectivePrices] = useState({ annual: 0, monthly: 0, type: '' });
  
  // Výběr uživatele
  const [selectedPlan, setSelectedPlan] = useState('annual'); 
  const [isAutoRenew, setIsAutoRenew] = useState(true);
  
  // Fakturační údaje (zákazník)
  const [billingName, setBillingName] = useState('');
  const [billingIco, setBillingIco] = useState('');
  const [billingDic, setBillingDic] = useState('');
  const [billingStreet, setBillingStreet] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingZip, setBillingZip] = useState('');

  // Stav objednávky: selection -> checkout -> success (QR) -> checking
  const [orderState, setOrderState] = useState('selection'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [variableSymbol, setVariableSymbol] = useState('');

  // Dodavatel - Arastea s.r.o.
  const supplier = {
    company: 'Arastea s.r.o.',
    ico: '28172825',
    street: 'Hartigova 2660/141',
    city: '130 00 Praha 3',
    account: '2712037003/5500' 
  };

  const calculateMonthlyPrice = (annualPrice) => {
    if (!annualPrice) return 0;
    return Math.round((annualPrice / 12) * 1.2);
  };

  useEffect(() => { 
    checkUser(); 
  }, []);

  async function checkUser() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(prof);
        
        if (prof?.billing_info) {
          setBillingName(prof.full_name || '');
          setBillingStreet(prof.billing_info); 
        } else {
          setBillingName(prof?.full_name || '');
        }

        if (prof?.club_id) {
          const { data: clubData } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single();
          setMyClub(clubData);
          
          const { data: myMemberRec } = await supabase.from('club_members').select('role').eq('club_id', prof.club_id).eq('user_id', authUser.id).single();
          if (!myMemberRec || myMemberRec.role !== 'owner') {
            window.location.href = '/kone'; 
            return;
          }

          const { data: sysData } = await supabase.from('system_settings').select('global_annual_price').eq('id', 1).single();
          const gPrice = sysData?.global_annual_price || 1200;
          setGlobalAnnualPrice(gPrice);

          if (clubData.custom_annual_price) {
            setEffectivePrices({ annual: clubData.custom_annual_price, monthly: calculateMonthlyPrice(clubData.custom_annual_price), type: 'Individuální dohodnutá cena' });
          } else if (clubData.locked_annual_price) {
            setEffectivePrices({ annual: clubData.locked_annual_price, monthly: calculateMonthlyPrice(clubData.locked_annual_price), type: 'Zafixovaná cena (Věrnostní)' });
          } else {
            setEffectivePrices({ annual: gPrice, monthly: calculateMonthlyPrice(gPrice), type: 'Standardní ceník' });
          }
        } else {
          window.location.href = '/kone';
        }
      } else {
        window.location.href = '/brana';
      }
    } finally { 
      setLoading(false); 
    }
  }

  const handleProceedToCheckout = (e) => {
    e.preventDefault();
    if (!billingName || !billingStreet || !billingCity) {
      alert('Vyplňte prosím název firmy/jméno a adresu pro fakturaci.');
      return;
    }
    setOrderState('checkout');
  };

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    const amountToPay = selectedPlan === 'annual' ? effectivePrices.annual : effectivePrices.monthly;
    const vs = Math.floor(10000000 + Math.random() * 90000000).toString(); 
    setVariableSymbol(vs);

    const orderData = {
      userEmail: profile.email,
      adminEmail: 'l.Vosika@arastea.cz', 
      clubName: myClub.name,
      amount: amountToPay,
      period: selectedPlan === 'annual' ? 'Roční' : 'Měsíční',
      vs: vs,
      billing: {
        name: billingName, ico: billingIco, dic: billingDic, street: billingStreet, city: billingCity, zip: billingZip
      },
      supplier: supplier
    };

    try {
      const fullBillingText = `${billingStreet}, ${billingCity} ${billingZip}`;
      await supabase.from('profiles').update({ 
        full_name: billingName,
        billing_info: `IČO: ${billingIco}, DIČ: ${billingDic}, Adresa: ${fullBillingText}`
      }).eq('id', user.id);

      // ZDE BUDE VOLÁNÍ API PRO ODESLÁNÍ FAKTURY
      // await fetch('/api/send-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });

      setOrderState('success');
    } catch (error) {
      alert('Chyba: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // NOVÁ FUNKCE: SPOUŠTÍ KONTROLU BANKY
  const handlePaymentDone = () => {
    setOrderState('checking');
    // Zde by v budoucnu probíhalo reálné dotazování na API banky
    // Prozatím simulujeme kontrolu
  };

  const getQRLink = (acc, amount, vs, msg) => {
    if (!acc) return null;
    const accNum = acc.split('/')[0];
    const bankCode = acc.split('/')[1];
    return `https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=${accNum}&bankCode=${bankCode}&amount=${amount}&currency=CZK&vs=${vs}&message=${encodeURIComponent(msg)}`;
  };

  if (loading) return <div style={styles.loader}>Otevírám platební bránu...</div>;

  return (
    <div style={styles.container}>
      <Head><title>Platba licence | Arastea</title></Head>

      <div style={styles.topNav}>
        <h2 style={{ margin: 0, color: '#fff' }}>💳 Předplatné Jezdeckého Impéria</h2>
        <button onClick={() => window.location.href = '/kone'} style={styles.btnNavOutline}>Zpět do stáje</button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        
        {orderState === 'selection' && (
          <form onSubmit={handleProceedToCheckout}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
              <div>
                <h3 style={{ color: '#3e2723', borderBottom: '2px solid #d7ccc8', paddingBottom: '10px' }}>1. Vyberte si období</h3>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>Platí pro vás: <strong>{effectivePrices.type}</strong></p>
                <div onClick={() => setSelectedPlan('annual')} style={{ ...styles.priceCard, border: selectedPlan === 'annual' ? '3px solid #4caf50' : '1px solid #ddd', background: selectedPlan === 'annual' ? '#e8f5e9' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#2e7d32' }}>Roční předplatné</h4>
                      <span style={{ fontSize: '0.8rem', background: '#c8e6c9', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>UŠETŘÍTE 20 %</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1.4rem' }}>{effectivePrices.annual} Kč</strong>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>jednou za rok</div>
                    </div>
                  </div>
                </div>
                <div onClick={() => setSelectedPlan('monthly')} style={{ ...styles.priceCard, border: selectedPlan === 'monthly' ? '3px solid #0288d1' : '1px solid #ddd', background: selectedPlan === 'monthly' ? '#e3f2fd' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#01579b' }}>Měsíční platba</h4>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>Bez závazků</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1.4rem' }}>{effectivePrices.monthly} Kč</strong>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>každý měsíc</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <h3 style={{ color: '#3e2723', marginTop: 0 }}>2. Fakturační údaje</h3>
                <div style={styles.formGroup}><label style={styles.label}>Firma / Jméno *</label><input type="text" value={billingName} onChange={e=>setBillingName(e.target.value)} style={styles.input} required /></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}><label style={styles.label}>IČO</label><input type="text" value={billingIco} onChange={e=>setBillingIco(e.target.value)} style={styles.input} /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>DIČ</label><input type="text" value={billingDic} onChange={e=>setBillingDic(e.target.value)} style={styles.input} /></div>
                </div>
                <div style={styles.formGroup}><label style={styles.label}>Ulice a č.p. *</label><input type="text" value={billingStreet} onChange={e=>setBillingStreet(e.target.value)} style={styles.input} required /></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 2 }}><label style={styles.label}>Město *</label><input type="text" value={billingCity} onChange={e=>setBillingCity(e.target.value)} style={styles.input} required /></div>
                  <div style={{ flex: 1 }}><label style={styles.label}>PSČ</label><input type="text" value={billingZip} onChange={e=>setBillingZip(e.target.value)} style={styles.input} /></div>
                </div>
                <button type="submit" style={{ ...styles.btnPrimary, background: '#4caf50', marginTop: '20px' }}>Pokračovat k platbě ➔</button>
              </div>
            </div>
          </form>
        )}

        {orderState === 'checkout' && (
          <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#3e2723', marginBottom: '25px' }}>Potvrzení objednávky</h2>
            <div style={{ background: '#fafafa', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #eee' }}>
              <div style={styles.sumRow}><span>Produkt:</span> <strong>Licence ({selectedPlan === 'annual' ? 'Roční' : 'Měsíční'})</strong></div>
              <div style={styles.sumRow}><span>Pro stáj:</span> <strong>{myClub?.name}</strong></div>
              <div style={styles.sumRow}><span>Odběratel:</span> <strong>{billingName}</strong></div>
              <div style={{ ...styles.sumRow, borderTop: '2px solid #ddd', paddingTop: '15px', marginTop: '15px', fontSize: '1.5rem' }}>
                <span>K úhradě:</span> <strong style={{ color: '#2e7d32' }}>{selectedPlan === 'annual' ? effectivePrices.annual : effectivePrices.monthly} Kč</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setOrderState('selection')} style={{ ...styles.btnOutline, flex: 1 }}>Změnit údaje</button>
              <button onClick={handleConfirmOrder} disabled={isProcessing} style={{ ...styles.btnPrimary, background: '#e65100', flex: 2 }}>
                {isProcessing ? 'Generuji fakturu...' : 'Potvrdit a odeslat'}
              </button>
            </div>
          </div>
        )}

        {orderState === 'success' && (
          <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ width: '70px', height: '70px', background: '#4caf50', borderRadius: '50%', color: '#fff', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>✓</div>
            <h2 style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>Objednávka byla odeslána!</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Faktura byla odeslána na e-mail <strong>{profile?.email}</strong>.<br/>
              Licence bude aktivována po přijetí platby.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', background: '#f5f5f5', padding: '30px', borderRadius: '15px', marginBottom: '30px' }}>
              <div style={{ textAlign: 'left', minWidth: '250px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#5d4037' }}>Podklady pro platbu</h4>
                <p><strong>Částka:</strong> {selectedPlan === 'annual' ? effectivePrices.annual : effectivePrices.monthly} Kč</p>
                <p><strong>Účet:</strong> {supplier.account}</p>
                <p><strong>Var. symbol:</strong> {variableSymbol}</p>
                <p><strong>Příjemce:</strong> {supplier.company}</p>
              </div>
              <div style={{ background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <img 
                  src={getQRLink(supplier.account, selectedPlan === 'annual' ? effectivePrices.annual : effectivePrices.monthly, variableSymbol, `Licence ${myClub?.name}`)} 
                  style={{ width: '200px', height: '200px' }} 
                  alt="QR Platba"
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px' }}>Naskenujte v bankovní aplikaci</p>
              </div>
            </div>

            <button onClick={handlePaymentDone} style={{ ...styles.btnPrimary, background: '#4caf50', padding: '15px 40px', width: 'auto' }}>
              MÁM ZAPLACENO, HOTOVO ➔
            </button>
          </div>
        )}

        {/* NOVÝ STAV: KONTROLA PLATBY V BANCE */}
        {orderState === 'checking' && (
          <div style={{ background: '#fff', padding: '50px 40px', borderRadius: '15px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={styles.spinnerLarge}></div>
            <h2 style={{ color: '#3e2723', marginTop: '30px' }}>Probíhá kontrola platby</h2>
            <div style={{ maxWidth: '600px', margin: '20px auto', background: '#fff3e0', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #ffb300' }}>
              <p style={{ margin: 0, color: '#5d4037', fontSize: '1.1rem', lineHeight: '1.5' }}>
                <strong>Důležité info:</strong> Rychlost ověření závisí na vaší bance. <br/>
                U <strong>okamžitých plateb</strong> dojde k aktivaci v řádu sekund. <br/>
                U běžných převodů může aktivace trvat do druhého pracovního dne.
              </p>
            </div>
            <p style={{ color: '#888', marginTop: '20px' }}>
              Tuto stránku můžete zavřít. Jakmile platbu uvidíme, licenci vám automaticky prodloužíme a pošleme potvrzení e-mailem.
            </p>
            <button onClick={() => window.location.href = '/kone'} style={{ ...styles.btnOutline, width: 'auto', padding: '12px 30px', marginTop: '30px' }}>
              Zpět do mé stáje
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#f4ece4', minHeight: '100vh', fontFamily: 'sans-serif' },
  loader: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#5d4037' },
  topNav: { display: 'flex', background: '#3e2723', padding: '15px 30px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  btnNavOutline: { background: 'transparent', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  priceCard: { padding: '20px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' },
  label: { fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '3px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box', fontSize: '1rem' },
  btnPrimary: { color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', padding: '15px', width: '100%', fontSize: '1rem' },
  btnOutline: { background: 'transparent', border: '1px solid #ccc', color: '#333', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', padding: '15px' },
  sumRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  spinnerLarge: {
    width: '60px', height: '60px', border: '6px solid #f3f3f3', borderTop: '6px solid #4caf50', borderRadius: '50%',
    margin: '0 auto', animation: 'spin 1s linear infinite'
  }
};

// CSS Animace pro spinner (vložit do globálního CSS nebo přidat style tag)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(styleSheet);
}
