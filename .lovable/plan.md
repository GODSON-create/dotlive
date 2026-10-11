# Comprehensive DOT Content & Product-Surface Audit

## Goal
Produce a concise, complete audit of the current DOT app before any edits. The audit will distinguish working product surfaces from legacy language, placeholders, unsupported promises, and planned features, while preserving genuine functionality and data.

## Audit scope

### 1. Inventory every surface
Review all public, authentication, onboarding, authenticated member, role-specific, admin, redirect, profile, venture, result, and error routes, plus shared headers, footers, workspace navigation, dialogs, tabs, empty/loading/error states, and CTA destinations.

For every route or shared surface, record:
- current route and page purpose;
- exact current copy or issue, with file and line reference;
- whether the underlying action/data is genuinely implemented;
- recommendation and proposed replacement copy;
- disposition: **Keep**, **Rewrite**, **Remove**, or **Coming Soon**.

### 2. Validate product truth
Apply these decisions consistently:
- **AVA** is the public product name; internal Vantage identifiers may remain invisible to users.
- Remove or qualify unsupported valuation, fundability, unicorn, certification, guaranteed funding, or outcome claims.
- **ARISE Foundry** is one Foundry hosted on DOT, not DOT itself.
- **DOT Work** and **DOT Store** remain accessible only as **Coming Soon**.
- **DOT Build** means **Missions, Moments, Connections, and My Journey**.
- **PING by DOT** is planned and must be labelled pending trademark clearance.
- **GRIOT** is a planned AI guide and must not appear live unless the implementation proves it is live.
- Preserve implemented auth, attribution, AVA logic/data, Wallet, Academy data, Spotlight data, Demo data, admin authorization, and other genuine functionality.

### 3. Trace claims and interactions
Check every CTA, button, link, form, and status message against its destination or action. Flag:
- dead, misleading, duplicated, or mismatched CTAs;
- future modules presented as operational;
- placeholder or hard-coded metrics presented as live;
- obsolete pricing, scholarship, funding, reward, valuation, and eligibility language;
- empty states that promise unavailable actions or outcomes;
- public/member/admin surfaces that describe the same feature differently.

### 4. Review information architecture and metadata
Audit shared navigation and all route metadata for:
- duplicate or obsolete routes and overlapping page purposes;
- titles/descriptions that still say Vantage, valuation network, venture creation network, or otherwise conflict with DOT’s current strategy;
- missing or non-unique title, description, Open Graph, and Twitter metadata;
- redirect/alias routes that should remain functional but not be treated as standalone content pages;
- role navigation that exposes planned modules as if they are live.

## Confirmed audit priorities from the initial read
These are verified current-state examples that the final audit will expand route by route:
- The home page still calls DOT “Africa’s Venture Valuation Network” and promotes immediate valuation, fundability, and unicorn-potential outputs.
- The root metadata contains duplicate descriptions, public “Vantage intelligence” language, and broad “idea to funded” outcome wording.
- `/vantage`, Academy, public venture/profile pages, Communities, Investors, and admin fields still expose Vantage publicly.
- Onboarding generates share copy claiming a startup “could become” a specific valuation.
- `/start` says founders move “from idea to funded.”
- DOT Work and DOT Store have substantial live-looking screens despite their Coming Soon navigation status.
- The Capital Partner page contains hard-coded portfolio/reserve examples that can read as live financial data.
- Several routes have title-only metadata, while redirect aliases correctly have no standalone content metadata.

## Deliverable structure

### Executive summary
- Highest-risk misleading claims
- Most important navigation/product-boundary mismatches
- Safe-to-keep functionality
- Recommended correction order

### Route-by-route audit table
| Route / surface | Exact current copy or issue | Product/functionality finding | Recommendation | Replacement copy | Disposition |
|---|---|---|---|---|---|

Group the table by:
1. Global shell, metadata, navigation, and errors
2. Public acquisition and marketing pages
3. Auth and onboarding
4. Core member journey: Dashboard, AVA, Foundry, Pitch, Spotlight, Events, Demo, Leaderboards, Wallet, profiles
5. Planned and role-specific surfaces: Store, Work/Build, Academy, Community OS, Investor, Capital Partner, PING, GRIOT
6. Admin and operational screens
7. Redirects, aliases, duplicate routes, and legacy surfaces

### Global voice principles
Provide a short copy standard covering evidence-based claims, AVA naming, progression language, Foundry hierarchy, planned-feature labels, financial language, CTA specificity, and empty-state honesty.

### Recommended content map
End with a proposed canonical page/navigation map showing what stays live, what is rewritten, what becomes Coming Soon, and what should be removed or redirected in a later implementation pass.

## Boundaries
- No source code, database, route, metadata, styling, or product logic changes.
- No fabricated product state or metrics.
- No removal recommendation solely because a surface is incomplete; retain valuable data and implemented workflows where possible.
- Internal technical identifiers are only flagged when they leak into user-visible copy.
