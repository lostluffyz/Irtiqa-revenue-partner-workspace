-- Migration 008: Fix Company ID Function Volatility
--
-- The generate_company_id() function was declared STABLE, but it calls
-- nextval() which is VOLATILE.  PostgREST executes STABLE functions
-- inside a read-only transaction, causing nextval() to fail with:
--
--   cannot execute nextval() in a read-only transaction
--
-- Changing the volatility to VOLATILE ensures PostgREST runs it in a
-- writable transaction, allowing the sequence to advance.

CREATE OR REPLACE FUNCTION public.generate_company_id()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 'RP-' || nextval('public.company_id_seq')::text;
$$;
