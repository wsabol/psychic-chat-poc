-- Create decryption helper functions
CREATE OR REPLACE FUNCTION decrypt_email(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, 'default_key');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_text(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, 'default_key');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_birth_date(encrypted BYTEA)
RETURNS DATE AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN CAST(pgp_sym_decrypt(encrypted, 'default_key') AS DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verify functions were created
SELECT 'Functions created successfully!' as status;
