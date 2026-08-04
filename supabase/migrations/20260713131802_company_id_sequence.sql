-- Migration 003: Company ID Sequence
-- Provides deterministic, collision-safe Company ID generation.
-- Format: RP-{padded_number}  (e.g., RP-1001)

CREATE SEQUENCE IF NOT EXISTS public.company_id_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Generate the next Company ID in RP-NNNN format
CREATE OR REPLACE FUNCTION public.generate_company_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 'RP-' || nextval('public.company_id_seq')::text;
$$;
