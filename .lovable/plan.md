# DOT Communities: member directory + join/leave

Scope: DOT communities and their UI only. Payments stay out of scope.

## Audit findings (checked in this session)
- `communities`: unique `referral_code`; `leader_id` FK to auth.users. There are no type, visibility or university columns, and `category` and `region` are free text.
- `community_members`: `UNIQUE(community_id, founder_id)` blocks duplicate joins. `status` is free text, with no CHECK on its values.
- RLS: any signed-in user can read every community row, including `referral_code`. Members can insert any `status` for themselves, so a member could write `'active'` into a community that would otherwise need approval. Members can see only their own membership row. Nobody but the leader can count members.
- Invite flow (`/join/$code`): calls the `find_community_by_referral_code` RPC, upserts an active membership, then sets `founder_profiles.community_id`. Keep it working as is.
- Routes: `/communities` is a static public page. `/_authenticated/community` is the leader dashboard, shown in nav only to community leaders and marked "future".

## Smallest additive migration
1. Add columns to `communities` (all nullable or defaulted):
   - `community_type text not null default 'interest'`, with a CHECK limited to `university | city | industry | interest | builder`. Backfill the existing row from `category` where it matches; otherwise it stays `interest`.
   - `university_name text`, `city text`, `country text`
   - `visibility text not null default 'public'`, with a CHECK limited to `public | invite_only`. `public` means listed and open to join. `invite_only` means listed but joinable only through a referral link.
   - `slug text unique` (nullable), for shareable detail URLs
2. Add indexes on `(community_type)`, `(visibility)` and `lower(name)`.
3. Membership integrity: block direct inserts by members. Revoke the "Founders join communities" INSERT policy and replace it with SECURITY DEFINER RPCs:
   - `join_community(_community_id)`: requires an active member (`is_active_member`). Allows only public communities. Inserts with `status='active'` and does nothing if the row exists. It never touches `founder_profiles.community_id` unless that is null, so the leader's referral attribution survives.
   - `join_community_by_code(_code)`: used by `/join/$code` and works for invite-only communities too. It keeps the current behaviour.
   - `leave_community(_community_id)`: deletes the caller's own row and clears `founder_profiles.community_id` if it pointed to that community.
   - The existing DELETE policy stays as a fallback.
4. `list_communities(_q, _type, _region, _limit, _offset)`: a SECURITY DEFINER function that returns public-safe fields plus `member_count` (a real count of active rows), `is_member` and `is_leader`. It never returns `referral_code`, except to the leader.
5. Hide referral codes: column-level revoke of `referral_code` SELECT from `authenticated`. The leader dashboard and `get_my_referral_code` keep working through a security-definer path. `/community` uses `get_my_referral_code`, so check that before revoking.
6. No seed data, and no fake counts: an empty directory shows an honest empty state.

## Files
- New migration via lov_database: the columns, CHECKs, indexes, the RPCs above, grants to `authenticated`, and policy changes.
- `src/lib/communities.functions.ts` (new): `createServerFn` with `requireSupabaseAuth`, wrapping list/join/leave with zod validation.
- `src/lib/communities.ts` (new): pure helpers for type labels, filter parsing and slug building.
- `src/routes/_authenticated/communities.index.tsx` (new, URL `/app/...`, avoiding the clash with public `/communities`). Proposed URL is `/explore-communities`. File: `_authenticated/explore-communities.tsx`, holding the directory with search, type chips, a region filter, and a validated search-params schema.
- `src/routes/_authenticated/explore-communities.$id.tsx` (new): community detail page with description, type/location/university, real member count, leader name, and join/leave actions.
- `src/components/communities/CommunityCard.tsx`, `CommunityFilters.tsx`, `JoinButton.tsx`, `EmptyState.tsx` (new).
- `src/routes/_authenticated/join.$code.tsx`: switch to the `join_community_by_code` RPC, with the same UI.
- `src/routes/_authenticated/community.tsx` (leader dashboard): add type, university, city, country and visibility fields to the create/edit form. No other changes.
- `src/components/app/AppShell.tsx`: add a core "Communities" nav item for all members. "Community OS" stays leader-only.
- `src/routes/communities.tsx` (public): CTA to sign in and browse. Copy only.
- `src/styles.css`: add `--glass-surface`, `--glass-border` and `--shadow-glow-emerald` tokens, plus a `.glass` utility.
- `AGENTS.md`: rule saying membership writes go through RPCs, and why.

## UI proposal
- Header band on an ink-green gradient with a subtle emerald/gold radial glow: title "Communities", one-line subtitle, and a search field.
- Sticky filter bar with type chips (University, City, Industry, Interest, Builder) and a region select. Chips are radio-group buttons with aria-pressed.
- Grid of glass cards (backdrop-blur and a translucent token surface). 1 column on mobile, 2 on tablet, 3 to 4 on desktop. Each card shows a type badge, name, location or university line, 2-line description, real member count, and a Join or Joined state. Invite-only cards show "Invite only".
- Motion: card fade/translate on enter and a lift on hover, using CSS transitions. These are turned off under `prefers-reduced-motion`. Optimistic join, with rollback on error and a toast.
- States: skeleton grid, error with retry, "No communities match", and "No communities yet" with no invented numbers.
- Accessibility: visible focus rings, labelled search, live region announcing join/leave, and 44px tap targets.

## Tests
- `src/lib/communities.test.ts`: type validation, filter parsing, slug helper.
- `src/lib/communities-sql.test.ts`: reads the migration SQL and asserts four things: the type and visibility CHECK values; that `join_community` rejects `invite_only` and requires `is_active_member`; that the direct INSERT policy is dropped; and that `list_communities` doesn't select `referral_code`.
- DB checks via read queries after migration:
  - the existing row is backfilled
  - joining twice gives one row
  - leaving removes the row
  - a non-member can't read others' memberships
- Playwright on a signed-in session at desktop, tablet and phone widths: directory loads, filtering works, join then leave updates the count, and there is no sideways scrolling.
- Run vitest, typecheck and the build log.

## Assumptions to confirm
- Directory lives at `/explore-communities` (signed-in only). Public `/communities` stays a marketing page.
- Members may join several communities. `founder_profiles.community_id` keeps meaning "primary / referral community".
- Invite-only communities are still listed, so members can discover them.
