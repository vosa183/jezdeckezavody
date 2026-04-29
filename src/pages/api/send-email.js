import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ message: 'Only POST allowed' });

  const { subject, text, emails } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.seznam.cz', // Uprav podle svého poskytovatele
      port: process.env.EMAIL_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Rozeslání na všechny e-maily v poli
    for (const email of emails) {
      await transporter.sendMail({
        from: `"Jezdecké Impérium" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        text: text,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Chyba emailu:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
