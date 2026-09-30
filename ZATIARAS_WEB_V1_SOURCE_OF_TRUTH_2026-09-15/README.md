# ZATIARAS WEB V1 - PROJECT SOURCE OF TRUTH

**Baseline:** Reconciled v1.1  
**Cut-off:** 15 September 2026  
**Scope:** Samarinda pilot, Juanda + Slamet Riyadi  
**Status:** Ready for implementation planning / agentic coding handoff

This repository pack connects the human-readable specification PDFs, repo-native Markdown context, and the three official Zatiaras brand PDFs into one source-of-truth system.

## 1. Domain-specific authority

There is no single file that overrides every domain.

| Domain | Primary authority | Agent companion |
|---|---|---|
| Business intent, outcomes, scope | `docs/human/01_Zatiaras_Web_V1_Business_Requirements_Document.pdf` | `docs/PRODUCT.md` |
| Product behavior/business rules | `docs/human/02_Zatiaras_Web_V1_Product_Requirements_Document.pdf` | `docs/SPEC_V1.md` |
| UX/customer & crew interaction | `docs/human/03_Zatiaras_Web_V1_UX_Customer_Journey_Interface_Specification.pdf` | `docs/UX.md` |
| Architecture/system boundaries | `docs/human/04_Zatiaras_Web_V1_Software_Architecture_Technical_Design.pdf` | `docs/ARCHITECTURE.md` + `docs/CONTRACTS.md` |
| Quality/launch gates | `docs/human/05_Zatiaras_Web_V1_QA_Validation_Rollout_Plan.pdf` | `docs/QUALITY.md` |
| Decision rationale/revisit triggers | `docs/human/06_Zatiaras_Web_V1_Decision_Register.pdf` | `AGENTS.md` + requirement/architecture files |
| Visual brand identity | 3 PDFs under `docs/brand/` | `docs/BRAND_REFERENCES.md` |
| Search/AI discovery implementation | Technical/Product specs | `docs/SEO_AI_DISCOVERY.md` |
| Measurement/analytics | BRD/PRD | `docs/ANALYTICS.md` |

## 2. Brand authority order

For visual identity and approved application rules:

1. `docs/brand/Zatiaras_Brand_Asset_Master_Pack_V1_0_12_Halaman.pdf` - exact assets, logo protection, approved variants, production/cup rules, QA.
2. `docs/brand/Zatiaras_Juice_Brand_Identity_Guidelines_V1.2_Reconciled_12_Halaman_FIXED_A4.pdf` - brand essence, messaging, colors, typography, slogan, graphic language, imagery.
3. `docs/brand/Zatiaras_Juice_Application_and_Rollout_Kit_V1.0_12_Halaman.pdf` - touchpoint/application patterns and rollout examples.

If a Markdown summary conflicts with these PDFs on visual identity, the relevant official PDF wins.

## 3. Agent reading order

Start with `AGENTS.md`, then read only the files relevant to the task.

Typical implementation path:

```text
AGENTS.md
  -> PRODUCT.md / SPEC_V1.md
  -> UX.md
  -> ARCHITECTURE.md / CONTRACTS.md
  -> BRAND_REFERENCES.md + referenced brand PDF pages
  -> QUALITY.md
  -> SEO_AI_DISCOVERY.md / ANALYTICS.md as needed
  -> code + tests
```

## 4. Conflict policy

- Do not silently reconcile conflicting requirements.
- Do not let project conversation override official brand assets.
- Do not let a visual mockup override requirements or brand PDFs.
- Do not let analytics events become accounting/payment truth.
- For behavior that can be validated by code, executable contracts/tests should become the final implementation evaluator.
- Legacy digital BRD is historical only and is not normative for this project.

## 5. Open decisions

The reconciled Decision Register intentionally leaves several items OPEN:

- production database/persistence after ZatiarasPOS data-layer audit,
- payment provider after current technical/commercial verification,
- large/group-order threshold,
- pickup-slot capacity rules,
- current production menu/price truth,
- exact refund automation capability.

Coding agents must not invent these values.

## 6. Baseline rule

A change that materially alters business scope, payment risk, customer promise, channel role, core UX, architecture, or brand implementation must update the relevant human PDF/decision record and its Markdown companion so both layers remain synchronized.

## 7. Brand production asset prerequisite

The three brand PDFs define the visual rules, but they are **not substitutes for production source assets**. Before implementing final branded UI, add the approved logo SVG(s), locked `Buahnya Berasa.` artwork, `Zatiaras Display` font, and any approved graphic-device assets to the repository.

If those source files are absent, the coding/design agent must **stop and request the official assets**, not redraw or extract/reconstruct them from the PDFs.
