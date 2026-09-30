# AGENTS.md — Zatiaras Web V1

**Baseline:** Reconciled v1.1  
**Human decision authority:** `docs/human/06_Zatiaras_Web_V1_Decision_Register.pdf`

## Mission

Build **Zatiaras Web V1** as Zatiaras Juice's owned digital storefront and pickup-ordering platform for Samarinda.

Primary loop:

**Discovery → Product Understanding → Self Order → Payment → Outlet Fulfillment → Pickup → Human Support → Repeat → First-Party Data**

This repository is intended for AI coding agents. Agents must prefer explicit requirements, executable contracts, tests, and official source files over guesses.

---

## Read order

For non-trivial work, read the relevant files using this precedence:

1. `README.md` (source-of-truth map)
2. `docs/PRODUCT.md`
3. `docs/SPEC_V1.md`
4. `docs/UX.md`
5. `docs/ARCHITECTURE.md`
6. `docs/CONTRACTS.md`
7. `docs/BRAND_REFERENCES.md`
8. `docs/QUALITY.md`
9. `docs/SEO_AI_DISCOVERY.md`
10. `docs/ANALYTICS.md`
11. Existing code and tests

If authoritative sources conflict, **do not silently reconcile**. Flag the conflict for human review.

---

## Official brand source files

Brand rules must be read from these PDFs under `docs/brand/`:

- `docs/brand/Zatiaras_Brand_Asset_Master_Pack_V1_0_12_Halaman.pdf`
- `docs/brand/Zatiaras_Juice_Brand_Identity_Guidelines_V1.2_Reconciled_12_Halaman_FIXED_A4.pdf`
- `docs/brand/Zatiaras_Juice_Application_and_Rollout_Kit_V1.0_12_Halaman.pdf`

Do not recreate brand rules from memory.

Use `docs/BRAND_REFERENCES.md` only as a navigation/index file. The PDFs remain authoritative.

---

## Decision Register linkage

The human Decision Register is authoritative for rationale and revisit triggers. Key implementation decisions include DEC-001 (web role), DEC-002 (Samarinda pilot), DEC-004 (guest checkout), DEC-005 (pickup-first), DEC-006 (verified-payment production rule), DEC-007 (human recovery), DEC-008 (availability model), DEC-012 (official brand authority), DEC-013 (simple staff UX), DEC-014 (SEO/AI discovery), DEC-016/017 (working SvelteKit + Cloudflare direction), DEC-018/019 (database and payment provider remain OPEN), DEC-020 (legacy BRD non-normative), and DEC-021 (dual human + agent documentation model).

## Product non-negotiables

- Initial market: **Samarinda**
- Initial outlets: **Juanda** and **Slamet Riyadi**
- Primary commerce mode: **pickup**
- Checkout: **guest checkout**, no mandatory account
- Customer-facing web: mobile-first
- No exact omnichannel inventory engine in V1
- Availability: `AVAILABLE`, `LIMITED`, `SOLD_OUT`
- Outlet load: `NORMAL`, `BUSY`, `VERY_BUSY`, `PAUSED`
- Marketplace channels remain independent in V1
- Paid-order exception must provide **human WhatsApp support**
- Group/large orders require outlet approval before payment once they cross the configured threshold
- Never invent an unsupported business rule

---

## Payment rules

- Never trust browser-only payment status
- Verify payment server-side
- Webhooks must be idempotent
- Duplicate webhooks must not duplicate orders or state transitions
- Unverified payment must not enter normal production
- Paid but unfulfillable orders must enter recovery
- Refund/substitution decisions must be recorded

---

## Staff UX rule

Outlet-facing interfaces must be usable by staff with relatively low digital literacy.

Prefer:
- large buttons,
- plain Indonesian,
- one primary action per screen,
- explicit statuses,
- minimal typing,
- safe defaults,
- easy recovery.

Do not expose backend jargon directly to crew.

---

## Brand implementation rule

Before UI work:

1. Read `docs/BRAND_REFERENCES.md`.
2. Open the relevant referenced PDF pages.
3. Use the official assets from the repository.
4. Do not redraw, retype, regenerate, or reinterpret official logo assets.
5. If the official SVG/font/artwork files required for production are missing, stop and request them. Do not reconstruct them from PDF screenshots.

AI-generated visual mockups are **not** brand source-of-truth.

---

## Task execution pattern

For each task:

1. Identify requirement IDs.
2. Read relevant docs and source PDFs.
3. Inspect existing code.
4. State assumptions only when unavoidable.
5. Implement the smallest coherent vertical slice.
6. Add/update tests.
7. Run validation.
8. Summarize changed behavior, files, risks, and open decisions.

Do not declare completion if required checks fail.
