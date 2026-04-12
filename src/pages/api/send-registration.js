import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Povolíme pouze metodu POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metoda není povolena' });
  }

  // Vytáhneme si data, která nám poslal frontend
  const { email, eventName, riderName, horseName, startNumber, disciplines, totalPrice } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Chybí e-mailová adresa' });
  }

  try {
    // 1. Nastavení odesílatele (Můstku)
    // Tyto údaje musíš mít schované v souboru .env.local
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // např. smtp.gmail.com nebo smtp.seznam.cz
      port: process.env.SMTP_PORT || 465,
      secure: true, // true pro port 465, false pro ostatní
      auth: {
        user: process.env.SMTP_USER, // Tvoje e-mailová adresa
        pass: process.env.SMTP_PASS, // Tvé heslo (nebo App Password u Gmailu)
      },
    });

    // 2. Formátování textu e-mailu do pěkného HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d7ccc8; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #5d4037; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Potvrzení přihlášky</h1>
          <p style="margin: 5px 0 0 0; font-size: 1.2rem;">Závody Pod Humprechtem</p>
        </div>
        <div style="padding: 20px; background-color: #f4ece4; color: #3e2723;">
          <p>Dobrý den,</p>
          <p>Vaše přihláška na závody <strong>${eventName}</strong> byla úspěšně přijata do systému!</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ccc;">
            <p style="margin: 0 0 10px 0;"><strong>Jezdec:</strong> ${riderName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Kůň:</strong> ${horseName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Přidělené startovní číslo:</strong> <span style="font-size: 1.5rem; color: #d32f2f; font-weight: bold;">${startNumber}</span></p>
            
            <h4 style="margin: 15px 0 5px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Zvolené disciplíny:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${disciplines.map(d => `<li>${d}</li>`).join('')}
            </ul>
            
            <h3 style="margin: 20px 0 0 0; text-align: right; color: #2e7d32;">
              Celková cena: ${totalPrice} Kč
            </h3>
          </div>

          <p>Těšíme se na Vás v aréně! 🤠</p>
          <p><em>Toto je automaticky generovaná zpráva, prosím neodpovídejte na ni.</em></p>
        </div>
      </div>
    `;

    // 3. Odeslání e-mailu
    const info = await transporter.sendMail({
      from: `"Závody Pod Humprechtem" <${process.env.SMTP_USER}>`, // Jméno odesílatele
      to: email, // Komu to letí (uživateli)
      subject: `Potvrzení přihlášky: ${eventName} - St. č. ${startNumber}`,
      html: htmlContent,
    });

    console.log("E-mail odeslán: %s", info.messageId);
    return res.status(200).json({ success: true, message: 'E-mail odeslán' });

  } catch (error) {
    console.error('Kritická chyba při odesílání e-mailu:', error);
    return res.status(500).json({ success: false, error: 'Nepodařilo se odeslat e-mail' });
  }
}
