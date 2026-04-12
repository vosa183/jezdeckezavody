import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nepovolena' });
  }

  try {
    const { email, password, role } = req.body;

    // Připojení k Supabase přes tajný Master klíč (Service Role Key)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // MUSÍ BÝT VE VERCELU!
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Vytvoření uživatele a jeho automatické potvrzení
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });

    if (authError) throw authError;

    // 2. Přiřazení role do tabulky profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email: email,
      role: role
    });

    if (profileError) throw profileError;

    // Úspěch!
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Chyba API:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
