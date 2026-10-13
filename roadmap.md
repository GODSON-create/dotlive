# Build 1 — Foundation (repair + verify)
- [x] Design tokens, shell (collapsible sidebar, mobile nav), Coming Soon future modules, dashboard and admin control room.
- [x] Missing database pieces the app expected restored (additive, security-reviewed); typecheck clean.
- [x] /foundry page added (ARISE = first Foundry; DOT stays global).
- [ ] Signed-in screen checks (dashboard, sidebar, mobile menu, admin) — blocked: your Lovable email has no DOT account, so the preview can't be signed in. Signed-out pages checked: no sideways scrolling; /foundry correctly sends signed-out visitors to sign-in.
- [ ] Admin treasury pool actions (lock/release/burn/transfer) and Store purchase have no backend actions yet — intentionally not built.
- [ ] Old unapplied files in supabase/migrations were NOT applied (unsafe: public PII, cross-wallet charges, hardcoded admin password).

# Build 2 — Acquisition + identity
- [x] Visit logging + first-touch member attribution (source, campaign, ref, foundry slug, landing path, visitor id, time).
- [x] Sources: Instagram, ARISE, WhatsApp, Telegram, Whop, Varsityscape, DOT, referral, Foundry (+ other).
- [x] Short links /ig /wa /tg /dot /r/:ref /c/:campaign → /start; query params ?source= ?utm_source= ?ref= ?campaign= ?foundry= work on any page.
- [x] Admin Acquisition tab: visits, visitors, members, founders, ventures by source.
- [ ] Referral codes are stored but not yet linked to a referring member's profile.
- [ ] Foundry relation is a slug for now; link to a foundries table when Build 3 creates it.
- [x] Founder/builder profiles visible only to active (non-suspended) signed-in members; contact details stay owner/admin-only.

# Content & product-surface audit
- [x] Route-by-route audit reported (no app code changed).
- [ ] P1 Remove fabricated data: Capital Partner mock commitments/portfolio, Community fake clicks/27%, homepage LIVE leaderboard + A/B toggle, scholarship 7420 counter, onboarding "Top 15%" fallback.
- [ ] P2 Remove unsupported claims: valuation/unicorn/"idea to funded"/free revaluations; qualify $200k pilot; Spotlight reach; Wallet "Become Fundable".
- [ ] P3 Work + Store → real Coming Soon screens (data kept). Blocked: confirm.
- [ ] P4 AVA naming everywhere user-visible; one slogan "Venture Progression Network".
- [ ] P5 /founder-scholarship → redirect to /scholarship; scholarship terms. Blocked: real terms.
- [ ] P6 /start Foundry step as "opens soon"; footer dead links; sitemap; per-page canonical + unique profile/result titles.
- [ ] P7 Admin IP column; treasury buttons disabled until RPCs exist; investor meeting-request dead end.
- [ ] P8 Planned labels: PING (pending trademark), GRIOT, DOT Build mapping. Blocked: DOT Build mapping.
