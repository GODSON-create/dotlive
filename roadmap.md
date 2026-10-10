# Build 1 — Foundation (repair + verify)
- [x] Design tokens, shell (collapsible sidebar, mobile nav), Coming Soon future modules, dashboard and admin control room.
- [x] Missing database pieces the app expected restored (additive, security-reviewed); typecheck clean.
- [x] /foundry page added (ARISE = first Foundry; DOT stays global).
- [ ] Signed-in screen checks (desktop/tablet/mobile of dashboard, sidebar, admin) — blocked: no preview sign-in session available.
- [ ] Admin treasury pool actions (lock/release/burn/transfer) and Store purchase have no backend actions yet — intentionally not built.
- [ ] Old unapplied files in supabase/migrations were NOT applied (unsafe: public PII, cross-wallet charges, hardcoded admin password).

# Build 2 — Acquisition + identity
- [x] Visit logging + first-touch member attribution (source, campaign, ref, foundry slug, landing path, visitor id, time).
- [x] Sources: Instagram, ARISE, WhatsApp, Telegram, Whop, Varsityscape, DOT, referral, Foundry (+ other).
- [x] Short links /ig /wa /tg /dot /r/:ref /c/:campaign → /start; query params ?source= ?utm_source= ?ref= ?campaign= ?foundry= work on any page.
- [x] Admin Acquisition tab: visits, visitors, members, founders, ventures by source.
- [ ] Referral codes are stored but not yet linked to a referring member's profile.
- [ ] Foundry relation is a slug for now; link to a foundries table when Build 3 creates it.
- [ ] Security decision pending: founder/builder profiles readable by all signed-in members.
