-- Add state and city columns to leads table
-- Enables geographic assignment and filtering in Smart Lead Assignment

ALTER TABLE public.leads ADD COLUMN state TEXT;
ALTER TABLE public.leads ADD COLUMN city TEXT;

CREATE INDEX idx_leads_state ON public.leads(state);
CREATE INDEX idx_leads_city ON public.leads(city);
