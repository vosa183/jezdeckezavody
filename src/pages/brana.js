/* eslint-disable */
import React from 'react';
import Head from 'next/head';

export default function VstupniBrana() {
  const enterApp = () => {
    window.location.href = '/kone';
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Jezdecké Impérium | Vstup</title>
      </Head>

      <div style={styles.content}>
        {/* LOGO SEKCE */}
        <div style={styles.logoWrapper}>
          <svg viewBox="0 0 100 100" style={styles.logo}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="#5d4037" strokeWidth="2" />
            <path 
              d="M30,70 C30,70 35,40 50,30 C65,20 80,35 80,55 C80,75 60,85 50,85 C40,85 30,75 30,70 Z M50,30 C50,30 55,15 45,10 C35,5 25,25 30,35" 
              fill="none" 
              stroke="#5d4037" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
            <circle cx="65" cy="45" r="2" fill="#5d4037" />
          </svg>
        </div>

        <h1 style={styles.title}>Jezdecké Impérium</h1>
        <p style={styles.subtitle}>Komplexní správa stáje, tréninků a závodů na jednom místě.</p>
        
        <div style={styles.divider}></div>

        <button onClick={enterApp} style={styles.btnEnter}>
          VSTOUPIT DO SYSTÉMU
        </button>

        <p style={styles.footer}>
          Fáze 2: Sandbox Mode Active
        </p>
      </div>

      <style jsx global>{`
        body { margin: 0; padding: 0; background-color: #f4ece4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
  },
  content: {
    maxWidth: '500px',
    animation: 'fadeIn 1.5s ease-in-out',
  },
  logoWrapper: {
    marginBottom: '30px',
  },
  logo: {
    width: '120px',
    height: '120px',
  },
  title: {
    color: '#3e2723',
    fontSize: '2.5rem',
    margin: '0 0 10px 0',
    letterSpacing: '1px',
  },
  subtitle: {
    color: '#8d6e63',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    margin: '0 0 40px 0',
  },
  divider: {
    width: '60px',
    height: '3px',
    backgroundColor: '#ffb300',
    margin: '0 auto 40px auto',
    borderRadius: '2px',
  },
  btnEnter: {
    background: '#5d4037',
    color: '#fff',
    border: 'none',
    padding: '18px 40px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(93, 64, 55, 0.2)',
    transition: 'transform 0.2s, background 0.2s',
  },
  footer: {
    marginTop: '50px',
    fontSize: '0.8rem',
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: '2px',
  }
};
