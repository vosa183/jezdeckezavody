import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, eventName, riderName, horseName, startNumber, disciplines, totalPrice } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Chybí e-mail' });
  }

  try {
    // Používáme vaše stávající údaje ze Seznamu!
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.seznam.cz',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"Závody pod Humprechtem" <${process.env.EMAIL_USER}>`,
        to: email, // Odesíláme přímo tomu jednomu jezdci
        subject: `Potvrzení přihlášky: ${eventName}`,
        html: `
          <div style="background-color: #f4ece4; padding: 40px; font-family: 'Trebuchet MS', sans-serif; text-align: center;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 4px double #5d4037; padding: 30px; box-shadow: 5px 5px 15px rgba(0,0,0,0.2);">
              <h1 style="color: #5d4037; font-size: 28px; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 2px;">POTVRZENÍ PŘIHLÁŠKY</h1>
              <h2 style="color: #8d6e63; font-size: 22px; margin-top: 0; margin-bottom: 25px; letter-spacing: 3px;">POD HUMPRECHTEM</h2>
              
              <p style="font-size: 18px; color: #333; line-height: 1.6; text-align: left;">
                Dobrý den,<br><br>
                Vaše přihláška na závody <strong style="color: #5d4037;">${eventName}</strong> byla úspěšně přijata a zapsána do systému!
              </p>
              
              <div style="background: #eefeeb; border: 2px dashed #4caf50; padding: 15px; margin: 25px 0; text-align: left;">
                <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>Jezdec:</strong> ${riderName}</p>
                <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>Kůň:</strong> ${horseName}</p>
                <p style="margin: 0 0 5px 0; font-size: 18px;"><strong>Vaše startovní číslo:</strong> <span style="font-size: 24px; color: #d32f2f; font-weight: bold; margin-left: 10px;">${startNumber}</span></p>
              </div>

              <div style="text-align: left; margin-bottom: 25px;">
                <h3 style="color: #5d4037; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Zvolené disciplíny:</h3>
                <ul style="font-size: 18px; color: #333; padding-left: 20px;">
                  ${disciplines.map(d => `<li style="margin-bottom: 5px;">${d}</li>`).join('')}
                </ul>
                <h3 style="color: #d32f2f; font-size: 22px; text-align: right; margin-top: 20px; padding-top: 15px; border-top: 2px solid #eee;">
                  Celkem k platbě: ${totalPrice} Kč
                </h3>
              </div>

              <p style="font-size: 16px; color: #555; text-align: center; margin-top: 30px;">
                Těšíme se na vás v aréně! 🤠<br><br>
                <em>Tým JK Sobotka</em>
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Chyba v send-registration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
