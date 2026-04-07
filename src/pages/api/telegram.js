// pages/api/telegram.js
export default async function handler(req, res) {
  // Povolíme pouze POST požadavky
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text } = req.body;
  
  // Načtení tajných klíčů z prostředí serveru
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ message: 'Chybí Telegram konfigurace na serveru.' });
  }

  try {
    // Volání Telegramu probíhá ZDE (bezpečně na serveru)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.description || 'Telegram API Error');
    }

    // Odpověď zpět našemu frontendu, že se to povedlo
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram Server Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
