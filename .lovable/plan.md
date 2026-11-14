# DOT Phase 0 — Read-only Audit Report (2026-11-14)

No code, database, route, config or deployment changes were made. Evidence comes from file reads, a read-only test run and database metadata only. No user records were read; the only number taken was a row count (18 profiles).

## 1. Executive findings and blockers
- **Branch blocker:** the repo has `main` plus an internal edit branch. There is no `dot-redesign-2026` branch, and I can't create branches from here (git is managed by the platform). Connecting GitHub through Lovable is the way to get that branch. Until then the redesign has to stay additive on the current line.
- **Build status unverified:** there's no build-error log this session. The last two build cycles left the type check and lint not run. The Ping foundation files (`src/lib/ping/*`, `src/lib/ping.functions.ts`, `src/routes/api/public/ping/*`) have never been compiled or tested.
- **Tests:** 5 files, 49 tests, all passing (`bunx vitest run`): attribution, challenge, communities, profile-visibility, wallet-pricing. They test helper logic only. There are no route, screen or database-policy tests.
- **Unsupported claims still in code:** valuation, unicorn and ranking wording remains in `src/lib/vantage.ts`, `vantage.functions.ts`, `routes/result.$id.tsx`, `founder.$dotId.tsx`, `venture.$slug.tsx`, `investors.tsx`, `_authenticated/dashboard.tsx`, `vantage.tsx` and `leaderboards.tsx`. The October content audit's fixes are only partly applied.
- **Duplicate route:** `/founder-scholarship` still exists alongside `/scholarship`. The approved merge was never done.
- **Ping:** the backend has never been reachable. The "Connect Ping" card isn't mounted on the dashboard. The five `PING_*` secrets are absent.
- **Database:** RLS is on for every public table. Seven earlier security findings remain untouched.

## 2. Route inventory and disposition
| Route | Status | Disposition |
|---|---|---|
| `/` index | Marketing; claims partly cleaned | Rewrite (becomes a personalised dashboard when signed in) |
| `/platform`, `/journey`, `/communities`, `/investors` | Static marketing | Merge into one product story; rewrite `/investors` claims |
| `/scholarship` | Live | Keep; $10,000 price, terms to follow |
| `/founder-scholarship` | Duplicate | Redirect to `/scholarship` |
| `/start` | Onboarding funnel | Rewrite (progressive verification) |
| `/auth`, `/reset-password` | Live | Keep and restyle |
| `/ig /wa /tg /dot /r/$ref /c/$campaign` | Attribution entry points | Keep |
| `/founder/$dotId`, `/venture/$slug`, `/result/$id` | Public profiles and results | Rewrite (remove valuation/unicorn wording) |
| `sitemap.xml` | Live | Keep; update after the merge |
| `/dashboard` | Real-data shell | Rewrite as the role-card home |
| `/onboarding` | Live | Merge into progressive verification |
| `/vantage` (AVA) | Live scoring | Keep the engine; rewrite copy; keep the internal Vantage name |
| `/academy` | Partial: question bank is empty | Keep (Whop bridge); blocked on real questions |
| `/challenge`, `/challenge-report` | Built; activation off | Keep |
| `/foundry` | ARISE, the first Foundry | Keep, framed as global |
| `/explore-communities`, `/$id`, `/join/$code`, `/community` | Directory, join/leave through the database's join/leave functions, leader dashboard | Keep; merge `/community` into the directory |
| `/pitchathons`, `/sessions`, `/spotlight`, `/demo`, `/leaderboards` | Partial | Keep; rewrite leaderboards claims |
| `/wallet` | Ledger plus pending transfers | Keep; becomes the shared wallet interface |
| `/investor`, `/capital-partner` | Partial; fake figures removed | Defer, behind the role switcher |
| `/store`, `/work` | Coming Soon | Defer; actions disabled |
| `/admin` | Control room, Ping tab | Keep and split into sections |
| `api/public/webhooks/paystack` | Live | Keep and leave untouched |
| `api/public/ping/*` | Unverified | Keep, inactive |

## 3. Feature status
Implemented: auth, profiles, DOT IDs, roles table, AVA scoring, wallet ledger mirror, Paystack top-up, attribution, communities join/leave, admin role elevation with audit.
Partial: Academy (no questions), Builders Challenge (no activation or credit), Pitchathons, Spotlight, Demo, Investor (meeting requests limited), Ping foundation.
Planned: DOT Build (Missions, Moments, Journey), GRIOT AI, Aurion, FINDR integration, Work, Store.
Broken or stale: `/founder-scholarship` duplicate; leftover valuation claims.
Unverified: signed-in screens across all roles (no matching test account was ever used), build output, Ping endpoints.

## 4. Identity and roles
There is one identity: `auth.users` → `profiles` (with `dot_id`, `active_role`) plus a `user_roles` table using the `app_role` enum (founder, community_leader, investor, admin, super_admin, builder, vendor, capital_partner, moderator). Roles are checked through `has_role` and `is_admin`, and role changes are audited in `role_audit_log`. This already fits "one identity, many roles".
Gaps:
- There's no verification-level model: only a `profiles.verified` boolean. Progressive verification needs tiers and evidence.
- There are no per-role profile tables for investors or capital partners. Only `founder_profiles` and `builder_profiles` exist.

## 5. Founder and investor profile gaps
`founder_profiles` holds venture, industry, stage, location, university, funding goal and AVA metrics.
Founder gaps: team or co-founders, traction metrics with evidence, deck and data room, a structured link to ventures (there's no ventures table; `/venture/$slug` builds pages from profile data), and a visibility setting per field.
Investor gaps: there's no investor profile table at all (thesis, cheque size, sectors, stages, geographies, accreditation). Without these fields, hybrid search and matching can't work.
Note: I couldn't find the master blueprint field list in the repo. Please send it so I can check field by field.

## 6. Wallet and ledger
In place: `wallets`, `transactions` copied by a trigger into the append-only `ledger_entries` (changes blocked), `transfer_requests` with events and admin review, idempotency keys, and `wallet_settings` that only the server can read. Purchase price and service reference are stored as separate values.
Gaps:
- Only one ledger exists. "Separate ledgers" (credit vs. programme utility vs. reserve) needs a ledger-type field, or separate ledgers behind one shared screen.
- `withdrawable_balance` is still a column. It's inert but present.
- Reconciliation (`wallet_reconciliation`) has no scheduled job.
- Concurrency and replay protection has never been checked against the live database.
- The FX rate and verified users are missing, so checkout and transfers are effectively off.

## 7. Database, migrations and security
- 28 migrations; all public tables have RLS.
- Sensitive tables refuse direct writes; all changes go through protected database functions.
- `ping_link_states` and `wallet_settings` have no policies, which locks them to server-only access.
- Open items:
  - Seven earlier security findings.
  - Many protected functions run with elevated rights and need an execute-permission review.
  - `pxxl_analytics` and `login_audit_log` accept inserts and need a check on who can insert.

## 8. Screen maps
**Mobile:** bottom tab bar (Home · Discover · Wallet · Ping launcher · Me). Home is swipeable role cards with a next action. Discover covers communities, people and ventures. AVA and Academy flows are full-screen steps.

**Desktop:** a persistent sidebar with role switcher, a three-pane workspace (navigation, list, detail), and the admin control room as a separate workspace.

## 9. Product boundaries
- **DOT:** the operating platform (identity, roles, wallet, AVA, progression).
- **PING:** separate messaging app. DOT only links accounts and Hubs and launches into Ping.
- **ARISE:** acquisition and the first Foundry.
- **AVA:** assessment engine inside DOT.
- **GRIOT AI:** planned guide, using the built-in AI service. Not live.
- **AURION:** not found in the code; scope needed.
- **FINDR:** independent product; future API integration only. Nothing exists yet.

## 10. Stack and readiness
TanStack Start v1, React 19, Vite 7, Tailwind v4, Lovable Cloud. There's no `typecheck` or `test` script in `package.json`. Lint exists but hasn't been run recently.
Readiness:
- Tests are green but narrow.
- The build is unconfirmed.
- No end-to-end or policy tests exist.

## 11. Branch, migration and rollback
1. Connect GitHub and create `dot-redesign-2026` there. Lovable version history is the rollback point.
2. Additive migrations only: new columns and tables, no drops. Each one gets a matching rollback script kept in the repo.
3. Feature flags so the new home and role switcher can sit alongside the old screens.
4. Merge after the acceptance tests below pass.

## 12. Prioritised backlog
1. **Confirm the build** (type check, lint, compile the Ping files). Acceptance: zero errors.
2. **Content cleanup** (valuation claims, scholarship redirect). Acceptance: a search finds none of the flagged strings; `/founder-scholarship` redirects to `/scholarship`.
3. **Verification tiers and per-role profile tables** (investor). Depends on 1. Acceptance: policy tests show members see only allowed fields.
4. **Role-card home and persistent switcher.** Depends on 3. Acceptance: mobile and desktop screenshots; role switch persists.
5. **Design system pass** (dark emerald, gold, restrained glass; full 20-point Unslop standard). Acceptance: the checklist passes on key screens.
6. **Shared wallet interface with separate ledger types.** Depends on 1. Acceptance: reconciliation shows zero difference; tests for replay and concurrency.
7. **Hybrid search and matching** (needs 3). Acceptance: founder↔investor results respect privacy.
8. **GRIOT orchestration MVP.** Acceptance: answers cite DOT data; no fabricated outcomes.
9. **Ping linking going live.** Blocked on Ping access and secrets.
10. **FINDR and Aurion contracts.** Blocked on their specifications.

## Open questions
- Master blueprint field list for founder and investor profiles.
- Aurion's scope.
- GitHub connection, so the branch can be created.
