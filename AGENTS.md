<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Acquisition attribution is first-touch: anonymous visits go through the `record_acquisition_visit` RPC, and members bind once via `claim_acquisition_attribution` (one row per user) — this keeps one identity per member whatever the source.
- Foundry links use `foundry_slug` until a foundries table exists — so DOT is never hard-coded to ARISE.
- Builders Challenge is additive: caller-scoped server functions and authenticated transactional RPCs own enrollment/progress, explicit admin roles own decisions, and role-plus-community ownership scopes lead reports; no new learning system or wallet mutations.
- Challenge confirmation/activation and credit issuance remain unavailable at the database RPC boundary until a separately verified payment integration is authorized; configuration can enable requests only.
- Community membership writes go only through the join_community / join_community_by_code / leave_community RPCs — prevents status spoofing and keeps founder_profiles.community_id as first referral attribution.
