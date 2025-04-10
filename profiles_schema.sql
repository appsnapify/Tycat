-- Dropar a constraint antiga
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar a nova constraint com chefe-equipe
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['organizador'::text, 'promotor'::text, 'chefe-equipe'::text])); 