-- 1. Tabulka pro licence (klíče), které budeš generovat
CREATE TABLE IF NOT EXISTS public.license_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key_code TEXT UNIQUE NOT NULL,
  duration_months INTEGER DEFAULT 12,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Rozšíření tabulky klubů o Trial a stav
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Tabulka pro členy týmu a jejich ROLE
-- Role: 'owner' (majitel), 'collaborator' (spolupracovník), 'trainer' (trenér)
CREATE TABLE IF NOT EXISTS public.club_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'trainer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(club_id, user_id)
);

-- 4. Tabulka pro pozvánky (aby systém věděl, kam Karla po přihlášení hodit)
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trainer',
  token TEXT UNIQUE NOT NULL,
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Nastavení RLS pro nové tabulky (Zámky)
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Členové vidí svůj tým" ON public.club_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin vidí vše v pozvánkách" ON public.invitations FOR ALL USING (auth.role() = 'authenticated');
