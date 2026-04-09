import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password, role } = req.body;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Chybí tajný klíč pro zakládání účtů.' });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
      id: authData.user.id,
      email: email,
      role: role
    }]);

    if (profileError) throw profileError;

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
        to: email,
        subject: 'Přístupové údaje do systému',
        html: `
          <div style="background-color: #f4ece4; padding: 40px; font-family: 'Trebuchet MS', sans-serif; text-align: center;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 4px double #5d4037; padding: 30px;">
              <h2 style="color: #5d4037; text-transform: uppercase;">Vítejte v systému!</h2>
              <p style="font-size: 18px; color: #333;">
                Byl Vám úspěšně založen účet s rolí: <b>${role}</b>
              </p>
              <div style="background: #eefeeb; border: 2px dashed #4caf50; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #2e7d32; font-size: 18px;">
                  <b>Přihlašovací e-mail:</b> ${email}<br>
                  <b>Vygenerované heslo:</b> ${password}
                </p>
              </div>
              <p style="font-size: 16px; color: #555;">
                Nyní se můžete přihlásit přímo na našem závodním portálu.
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Chyba:', error);
    res.status(500).json({ error: error.message });
  }
}
