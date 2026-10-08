-- Keep the Diario AI allowance affordable by default.
-- Already applied to the production database on 2026-10-08.
-- Replaying the schema must not silently restore the old US$10 default.
ALTER TABLE public.ai_budget_months
  ALTER COLUMN limit_usd SET DEFAULT 5.00;

-- Existing historical accounting is not rewritten.
-- Each request still uses the atomic reserve_ai_budget RPC.
