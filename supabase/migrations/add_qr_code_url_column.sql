-- Adiciona a coluna qr_code_url à tabela guests se ela não existir
DO $$
BEGIN
    -- Verifica se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'guests' 
        AND column_name = 'qr_code_url'
    ) THEN
        -- Adiciona a coluna
        ALTER TABLE guests ADD COLUMN qr_code_url TEXT;
        
        -- Log da alteração
        RAISE NOTICE 'Coluna qr_code_url adicionada à tabela guests';
    ELSE
        RAISE NOTICE 'Coluna qr_code_url já existe na tabela guests';
    END IF;
END $$; 