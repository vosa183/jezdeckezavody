import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { eventName, eventDate, emails } = req.body;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: 'Chybí e-mailová konfigurace na serveru.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.seznam.cz',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Získání absolutní adresy tvého webu pro stažení a připojení PDF
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const pdfUrl = `${protocol}://${host}/pozvanka.pdf`; // Zde předpokládáme název 'pozvanka.pdf' ve složce public

    const mailOptions = {
      from: `"Závody pod Humprechtem" <${process.env.EMAIL_USER}>`,
      bcc: emails, 
      subject: `Nové závody vypsány: ${eventName}`,
      html: `
        <div style="background-color: #f4ece4; padding: 40px; font-family: 'Trebuchet MS', sans-serif; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 4px double #5d4037; padding: 30px; box-shadow: 5px 5px 15px rgba(0,0,0,0.2);">
            <h1 style="color: #5d4037; font-size: 28px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 2px;">WESTERNOVÉ HOBBY ZÁVODY</h1>
            <h2 style="color: #8d6e63; font-size: 22px; margin-top: 0; margin-bottom: 25px; letter-spacing: 3px;">POD HUMPRECHTEM</h2>

            <p style="font-size: 18px; color: #333; line-height: 1.6;">
              Dobrý den,<br><br>
              právě jsme otevřeli přihlášky na nový závod:<br>
              <strong style="font-size: 22px; color: #5d4037;">${eventName}</strong>
            </p>

            <div style="background: #eefeeb; border: 2px dashed #4caf50; padding: 15px; margin: 25px 0;">
              <h3 style="margin: 0; color: #2e7d32; font-size: 20px;">Datum konání: ${new Date(eventDate).toLocaleDateString('cs-CZ')}</h3>
            </div>

            <p style="font-size: 18px; color: #333; font-weight: bold; text-transform: uppercase;">
              KOLBIŠTĚ POD ZÁMKEM HUMPRECHT
            </p>

            <div style="background: #ffe0b2; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0; border: 2px solid #e65100;">
              <strong style="color: #e65100; font-size: 20px; text-transform: uppercase;">🍺 OBČERSTVENÍ ZAJIŠTĚNO 🍔</strong>
            </div>

            <p style="font-size: 16px; color: #555;">
              Přihlášky můžete podávat rovnou v našem závodním portálu.<br><br>
              Těšíme se na vás!<br>
              <em>Tým JK Sobotka</em>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'Pozvanka_Humprecht.pdf',
          path: pdfUrl
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Chyba při odesílání e-mailů:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
