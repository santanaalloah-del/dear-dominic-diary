-- Budget accounting is private to trusted server jobs.
-- The proactive brain and life loop read these tables through service_role;
-- without SELECT the proactive event is stuck with SQLSTATE 42501.
-- RLS stays enabled and no anon/authenticated grants are added.
GRANT SELECT ON TABLE public.ai_budget_reservations, public.ai_budget_months TO service_role;
