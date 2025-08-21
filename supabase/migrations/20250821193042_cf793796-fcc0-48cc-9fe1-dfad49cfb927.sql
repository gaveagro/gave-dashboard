-- First migration: Add demo role to enum
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE app_role ADD VALUE 'demo';
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;