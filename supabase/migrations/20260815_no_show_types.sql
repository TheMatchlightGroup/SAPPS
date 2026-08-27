-- =====================================================================
-- SAPPS — No-show billing types (8/15/2026, per Cris)
--  * 'Probation No Show'      → bills $0.00 (examiner collects the
--                               no-show fee directly on site)
--  * 'Pre-Employment No Show' → bills a flat $100.00 to the agency
-- Billing defaults live in the frontend (TEST_TYPE_BILLING_DEFAULTS);
-- both types are exempt from the written-report requirement.
-- Applied live via MCP on 8/15/2026.
-- =====================================================================
alter type public.exam_type add value if not exists 'Probation No Show';
alter type public.exam_type add value if not exists 'Pre-Employment No Show';
