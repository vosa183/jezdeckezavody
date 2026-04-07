import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Povolíme pouze POST požadavky z našeho frontendu
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { eventName, eventDate, emails } = req.body;

  // Kontrola, zda máme na serveru nastavené přihlašovací údaje k Seznamu
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: 'Chybí e-mailová konfigurace na serveru.' });
  }

  try {
    // Připojení k Seznam SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.seznam.cz',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Vytvoření e-mailu s texty z pozvánky
    const mailOptions = {
      from: `"Závody pod Humprechtem" <${process.env.EMAIL_USER}>`,
      bcc: emails, // 'bcc' znamená skrytá kopie - jezdci na sebe navzájem neuvidí e-maily!
      subject: `Nové závody vypsány: ${eventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
          <h2 style="color: #5d4037; text-align: center;">WESTERNOVÉ HOBBY ZÁVODY<br/>POD HUMPRECHTEM</h2>
          <hr style="border: 1px solid #8d6e63; margin-bottom: 20px;" />
          <p style="font-size: 1.1rem; color: #333;">Dobrý den,</p>
          <p style="font-size: 1.1rem; color: #333;">právě jsme v našem systému otevřeli přihlášky na nový závod: <strong>${eventName}</strong>.</p>
          <p style="font-size: 1.1rem; color: #333;"><strong>Datum konání:</strong> ${new Date(eventDate).toLocaleDateString('cs-CZ')}</p>
          <p style="font-size: 1.1rem; color: #333;">Zveme vás na kolbiště pod zámkem Humprecht. Přihlášky můžete podávat rovnou v našem závodním portálu.</p>
          <div style="background: #ffe0b2; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <strong style="color: #e65100; font-size: 1.2rem;">🍺 OBČERSTVENÍ ZAJIŠTĚNO 🍔</strong>
          </div>
          <p style="font-size: 1.1rem; color: #333;">Těšíme se na vás pod Humprechtem!<br/><em>Tým JK Sobotka</em></p>
        </div>
      `,
    };

    // Odeslání e-mailu
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Chyba při odesílání e-mailů:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
