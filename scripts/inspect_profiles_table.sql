-- Consulta para obter a definição das colunas da tabela public.profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
AND 
    table_name = 'profiles';

-- Este comando não altera nada no seu banco de dados.
-- Ele apenas lê os metadados para mostrar a estrutura da tabela. 