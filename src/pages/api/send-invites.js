import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { eventName, eventDate, emails } = req.body;

  try {
    // 1. VYTVOŘENÍ PDF NA MÍRU
    const filePath = path.join(process.cwd(), 'public', 'pozvanka.pdf');
    const existingPdfBytes = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const eventDateString = `Datum konání: ${new Date(eventDate).toLocaleDateString('cs-CZ')}`;

    let nameSize = 24; 
    let nameWidth = font.widthOfTextAtSize(eventName, nameSize);
    const maxWidth = width - 120; 

    while (nameWidth > maxWidth && nameSize > 10) {
      nameSize -= 1;
      nameWidth = font.widthOfTextAtSize(eventName, nameSize);
    }

    // Nápis závodu (bílá)
    firstPage.drawText(eventName, {
      x: (width - nameWidth) / 2, 
      y: height - 295, 
      size: nameSize, 
      font: font,
      color: rgb(1, 1, 1), 
    });

    // Datum závodu (černá)
    const dateWidth = font.widthOfTextAtSize(eventDateString, 18);
    firstPage.drawText(eventDateString, {
      x: (width - dateWidth) / 2, 
      y: height - 410, 
      size: 18,
      font: font,
      color: rgb(0, 0, 0), 
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 2. ODESLÁNÍ DO TELEGRAMU S KLIKACÍM ODKAZEM
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const formData = new FormData();
      formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
      
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('document', blob, 'Pozvanka.pdf');
      
      // Text s odkazem na web
      const tgCaption = `🤠 <b>NOVÉ ZÁVODY VYPSÁNY!</b> 🤠\n\n🏆 <b>${eventName}</b>\n📅 <b>${eventDateString}</b>\n📍 Kolbiště pod zámkem Humprecht\n\n🍔 Občerstvení je plně zajištěno!\n\n👉 <b>Přihlášky podávejte zde:</b> <a href="https://www.jezdeckezavody.cz">www.jezdeckezavody.cz</a>\n\nTěšíme se na vás! 👇`;
      
      formData.append('caption', tgCaption);
      formData.append('parse_mode', 'HTML');

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      });
    }

    // 3. ODESLÁNÍ NA E-MAILY PŘES SEZNAM
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS && emails && emails.length > 0) {
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
        bcc: emails, 
        subject: `Nové závody: ${eventName}`,
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
                <h3 style="margin: 0; color: #2e7d32; font-size: 20px;">${eventDateString}</h3>
              </div>
              <p style="font-size: 18px; color: #333; font-weight: bold; text-transform: uppercase;">
                KOLBIŠTĚ POD ZÁMKEM HUMPRECHT
              </p>
              <div style="background: #ffe0b2; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0; border: 2px solid #e65100;">
                <strong style="color: #e65100; font-size: 20px; text-transform: uppercase;">🍺 OBČERSTVENÍ ZAJIŠTĚNO 🍔</strong>
              </div>
              <p style="font-size: 18px; margin-top: 30px;">
                👉 <a href="https://www.jezdeckezavody.cz" style="color: #d32f2f; text-decoration: none; font-weight: bold;">Přihlásit se na závody můžete zde</a>
              </p>
              <p style="font-size: 16px; color: #555;">
                V příloze tohoto e-mailu naleznete oficiální pozvánku.<br><br>
                Těšíme se na vás!<br>
                <em>Tým JK Sobotka</em>
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: 'Pozvanka_Humprecht.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Chyba v send-invites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
