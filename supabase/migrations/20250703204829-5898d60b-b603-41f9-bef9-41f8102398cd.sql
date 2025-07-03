-- Crear perfil para hectoreduardo.gox@gmail.com manualmente
INSERT INTO public.profiles (user_id, email, name, role, account_balance)
VALUES (
  '463833c0-3a20-44cf-b35c-4d29c4998ace',
  'hectoreduardo.gox@gmail.com',
  'Hector Eduardo',
  'investor',
  0
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name;